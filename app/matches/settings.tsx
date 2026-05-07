import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { customGamePresetId, getGamePreset, getGamePresetsByCategory, type GamePreset } from '@/features/matches/gamePresets';
import { createId } from '@/features/matches/matchFactory';
import { getMatch, saveMatch } from '@/features/matches/matchStorage';
import { savePlayerNames } from '@/features/matches/playerStorage';
import { DEFAULT_OUT_LIMIT, createScoringRule, getScoringPreset, getScoringRule, modeNeedsTarget, scoringPresets } from '@/features/matches/scoringRules';
import type { Match, Player, Round, ScoringMode } from '@/features/matches/types';
import { useKeyboardBottomInset } from '@/hooks/use-keyboard-bottom-inset';
import { useScoreMateTheme } from '@/hooks/use-scoremate-theme';
import { useI18n } from '@/src/i18n';

function getDefaultTeamName(teamIndex: number) {
  return `Team ${String.fromCharCode(65 + teamIndex)}`;
}

function getTeamNames(players: Player[]) {
  const teamNames = players.map((player) => player.teamName).filter((teamName): teamName is string => Boolean(teamName));
  return Array.from(new Set(teamNames));
}

function getNextTeamName(players: Player[]) {
  const teamNames = getTeamNames(players);

  if (teamNames.length === 0) {
    return getDefaultTeamName(0);
  }

  const teamCounts = teamNames.map((teamName) => ({
    teamName,
    count: players.filter((player) => player.teamName === teamName).length,
  }));

  return teamCounts.sort((first, second) => first.count - second.count || first.teamName.localeCompare(second.teamName))[0].teamName;
}

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, ' ');
}

export default function MatchSettingsScreen() {
  const theme = useScoreMateTheme();
  const { t } = useI18n();
  const keyboardBottomInset = useKeyboardBottomInset();
  const { matchId } = useLocalSearchParams<{ matchId?: string }>();
  const [match, setMatch] = useState<Match | null>(null);
  const [matchName, setMatchName] = useState('');
  const [selectedGamePresetId, setSelectedGamePresetId] = useState(customGamePresetId);
  const [scoringMode, setScoringMode] = useState<ScoringMode>('outLimit');
  const [scoreTarget, setScoreTarget] = useState(String(DEFAULT_OUT_LIMIT));
  const [players, setPlayers] = useState<Player[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [teamMode, setTeamMode] = useState(false);
  const [rulesModalPresetId, setRulesModalPresetId] = useState<string | null>(null);

  useEffect(() => {
    if (!matchId) {
      return;
    }

    getMatch(matchId).then((storedMatch) => {
      if (!storedMatch) {
        return;
      }

      const rule = getScoringRule(storedMatch);
      setMatch(storedMatch);
      setMatchName(storedMatch.name);
      setSelectedGamePresetId(storedMatch.gamePresetId ?? customGamePresetId);
      setScoringMode(rule.mode);
      setScoreTarget(String(rule.targetScore ?? storedMatch.outLimit ?? DEFAULT_OUT_LIMIT));
      setPlayers(storedMatch.players);
      setTeamMode(new Set(storedMatch.players.map((player) => player.teamName).filter(Boolean)).size > 1);
    });
  }, [matchId]);

  const selectedScoringPreset = getScoringPreset(scoringMode);
  const needsTarget = modeNeedsTarget(scoringMode);
  const rulesModalPreset = getGamePreset(rulesModalPresetId);
  const teamSummaryRows = getTeamNames(players).map((teamName) => ({
    teamName,
    players: players.filter((player) => player.teamName === teamName),
  }));

  function handleSelectGamePreset(gamePreset: GamePreset) {
    setSelectedGamePresetId(gamePreset.id);
    setScoringMode(gamePreset.scoringMode);

    if (gamePreset.targetScore) {
      setScoreTarget(String(gamePreset.targetScore));
    }

  }

  function handleSelectScoringMode(mode: ScoringMode) {
    const preset = getScoringPreset(mode);
    setSelectedGamePresetId(customGamePresetId);
    setScoringMode(mode);

    if (preset.defaultTargetScore) {
      setScoreTarget(String(preset.defaultTargetScore));
    }
  }

  function handleToggleTeamMode() {
    const nextValue = !teamMode;
    setTeamMode(nextValue);
    setPlayers((currentPlayers) =>
      currentPlayers.map((player, index) =>
        nextValue ? { ...player, teamName: player.teamName ?? getDefaultTeamName(index % 2) } : { id: player.id, name: player.name },
      ),
    );
  }

  function handleAddPlayer() {
    const normalizedNewPlayerName = normalizeName(newPlayerName);

    if (!normalizedNewPlayerName) {
      Alert.alert('Player name required', 'Enter a player name.');
      return;
    }

    if (players.some((player) => normalizeName(player.name).toLowerCase() === normalizedNewPlayerName.toLowerCase())) {
      Alert.alert('Duplicate player', 'Player names must be unique for this match.');
      return;
    }

    setPlayers((currentPlayers) => [
      ...currentPlayers,
      {
        id: createId('player'),
        name: normalizedNewPlayerName,
        ...(teamMode ? { teamName: getNextTeamName(currentPlayers) } : {}),
      },
    ]);
    setNewPlayerName('');
  }

  function handleRenamePlayer(playerId: string, name: string) {
    setPlayers((currentPlayers) => currentPlayers.map((player) => (player.id === playerId ? { ...player, name } : player)));
  }

  function playerHasScores(playerId: string) {
    return match?.rounds.some((round) => round.scores.some((score) => score.playerId === playerId)) ?? false;
  }

  function removePlayerScores(rounds: Round[], playerId: string) {
    return rounds.map((round) => ({
      ...round,
      scores: round.scores.filter((score) => score.playerId !== playerId),
    }));
  }

  function handleRemovePlayer(player: Player) {
    if (!match) {
      return;
    }

    if (players.length <= 2) {
      Alert.alert('Keep two players', 'A match needs at least two players.');
      return;
    }

    const removePlayer = () => {
      setPlayers((currentPlayers) => currentPlayers.filter((storedPlayer) => storedPlayer.id !== player.id));

      if (playerHasScores(player.id)) {
        setMatch((currentMatch) =>
          currentMatch
            ? {
                ...currentMatch,
                rounds: removePlayerScores(currentMatch.rounds, player.id),
              }
            : currentMatch,
        );
      }
    };

    if (!playerHasScores(player.id)) {
      removePlayer();
      return;
    }

    Alert.alert('Remove player?', `This removes "${player.name}" and their saved scores from this match history.`, [
      { text: t('cancel'), style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: removePlayer,
      },
    ]);
  }

  async function handleSaveSettings() {
    if (!match) {
      return;
    }

    const trimmedName = matchName.trim();
    const parsedTarget = Number(scoreTarget);

    if (!trimmedName) {
      Alert.alert('Match name required', 'Enter a match name.');
      return;
    }

    if (needsTarget && (!Number.isFinite(parsedTarget) || parsedTarget <= 0)) {
      Alert.alert('Invalid score target', `${selectedScoringPreset.inputLabel ?? 'Score target'} must be greater than 0.`);
      return;
    }

    const normalizedTarget = needsTarget ? Math.floor(parsedTarget) : undefined;
    const selectedGamePreset = getGamePreset(selectedGamePresetId);
    const normalizedPlayers: Player[] = players.map((player) => ({
      ...player,
      name: normalizeName(player.name),
    }));
    const invalidPlayer = normalizedPlayers.find((player) => !player.name);

    if (invalidPlayer) {
      Alert.alert('Player name required', 'Every player needs a name.');
      return;
    }

    if (normalizedPlayers.length < 2) {
      Alert.alert('Add at least 2 players', 'A match needs at least two players.');
      return;
    }

    const duplicatePlayerNames = new Set<string>();

    for (const player of normalizedPlayers) {
      const normalizedPlayerName = player.name.toLowerCase();

      if (duplicatePlayerNames.has(normalizedPlayerName)) {
        Alert.alert('Duplicate player', 'Player names must be unique for this match.');
        return;
      }

      duplicatePlayerNames.add(normalizedPlayerName);
    }

    const matchPlayers: Player[] = teamMode ? normalizedPlayers : normalizedPlayers.map((player) => ({ id: player.id, name: player.name }));

    if (teamMode) {
      const activeTeams = new Set(matchPlayers.map((player) => player.teamName).filter(Boolean));

      if (activeTeams.size < 2) {
        Alert.alert('Add two teams', 'Team scoring needs at least one player on two teams.');
        return;
      }
    }

    await saveMatch({
      ...match,
      name: trimmedName,
      players: matchPlayers,
      outLimit: scoringMode === 'outLimit' ? normalizedTarget ?? DEFAULT_OUT_LIMIT : match.outLimit,
      scoringRule: createScoringRule(scoringMode, normalizedTarget),
      gamePresetId: selectedGamePreset?.id,
      gamePresetName: selectedGamePreset?.shortTitle,
    });
    await savePlayerNames(matchPlayers.map((player) => player.name));

    router.back();
  }

  if (!match) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>Match not found</Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.keyboardView, { backgroundColor: theme.colors.screen }]}>
      <ScrollView
        style={[styles.screen, { backgroundColor: theme.colors.screen }]}
        contentContainerStyle={[styles.container, keyboardBottomInset > 0 && { paddingBottom: keyboardBottomInset + 32 }]}
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        keyboardShouldPersistTaps="handled">
        <View style={[styles.heroCard, { backgroundColor: theme.colors.hero }]}>
          <Text style={[styles.kicker, { color: theme.colors.accent }]}>Match setup</Text>
          <Text style={styles.title}>{t('settings')}</Text>
          <Text style={styles.subtitle}>Rename the match or adjust the scoring setup.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>{t('matchName')}</Text>
          <TextInput
            autoCapitalize="words"
            onChangeText={setMatchName}
            placeholder="Match name"
            placeholderTextColor="#94A3B8"
            style={styles.input}
            value={matchName}
          />
        </View>

        <View style={styles.card}>
          <View style={styles.teamModePanel}>
            <View style={styles.teamModeTextBlock}>
              <Text style={styles.teamModeTitle}>Team scoring</Text>
              <Text style={styles.teamModeText}>{teamMode ? `${teamSummaryRows.length} teams in this match` : 'Use individual scoring for each player.'}</Text>
            </View>
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: teamMode }}
              onPress={handleToggleTeamMode}
              style={({ pressed }) => [styles.teamSwitch, teamMode && { backgroundColor: theme.colors.primary }, pressed && styles.pressed]}>
              <Text style={[styles.teamSwitchText, teamMode && styles.teamSwitchTextActive]}>{teamMode ? 'On' : 'Off'}</Text>
            </Pressable>
          </View>

          {teamMode && teamSummaryRows.length > 0 ? (
            <View style={styles.teamSummaryTable}>
              {teamSummaryRows.map((team) => (
                <View key={team.teamName} style={styles.teamSummaryRow}>
                  <Text style={styles.teamSummaryName}>{team.teamName}</Text>
                  <Text style={styles.teamSummaryPlayers}>{team.players.map((player) => player.name).join(', ')}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.addPlayerPanel}>
            <TextInput
              autoCapitalize="words"
              onChangeText={setNewPlayerName}
              onSubmitEditing={handleAddPlayer}
              placeholder="Add player"
              placeholderTextColor="#94A3B8"
              returnKeyType="done"
              style={styles.addPlayerInput}
              value={newPlayerName}
            />
            <Pressable accessibilityRole="button" onPress={handleAddPlayer} style={({ pressed }) => [styles.addPlayerButton, { backgroundColor: theme.colors.primary }, pressed && styles.pressed]}>
              <Text style={styles.addPlayerButtonText}>{t('add')}</Text>
            </Pressable>
          </View>
          <Text style={styles.helperText}>Late players start at 0 for earlier rounds.</Text>

          <View style={styles.playerTeamList}>
            {players.map((player, index) => (
              <View key={player.id} style={styles.playerTeamRow}>
                <View style={styles.playerTeamTextBlock}>
                  <TextInput
                    autoCapitalize="words"
                    onChangeText={(value) => handleRenamePlayer(player.id, value)}
                    placeholder={`Player ${index + 1}`}
                    placeholderTextColor="#94A3B8"
                    style={styles.playerNameInput}
                    value={player.name}
                  />
                  <Text style={styles.playerTeamMeta}>
                    Player {index + 1}{playerHasScores(player.id) ? ' - has round scores' : ''}
                  </Text>
                </View>
                <View style={styles.playerActionRow}>
                  <Pressable accessibilityRole="button" onPress={() => handleRemovePlayer(player)} style={({ pressed }) => [styles.removePlayerButton, pressed && styles.pressed]}>
                    <Text style={styles.removePlayerButtonText}>Remove</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Game library</Text>
          <View style={styles.optionList}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setSelectedGamePresetId(customGamePresetId)}
              style={({ pressed }) => [
                styles.optionCard,
                selectedGamePresetId === customGamePresetId && { backgroundColor: theme.colors.softAccent, borderColor: theme.colors.accent },
                pressed && styles.pressed,
              ]}>
              <Text style={[styles.optionTitle, selectedGamePresetId === customGamePresetId && { color: theme.colors.secondaryText }]}>{t('customScorekeeper')}</Text>
              <Text style={[styles.optionDescription, selectedGamePresetId === customGamePresetId && { color: theme.colors.secondaryText }]}>
                Choose scoring style manually.
              </Text>
            </Pressable>

            {getGamePresetsByCategory('All').map((gamePreset) => {
              const isSelected = selectedGamePresetId === gamePreset.id;
              return (
                <View
                  key={gamePreset.id}
                  style={[
                    styles.optionCard,
                    isSelected && { backgroundColor: theme.colors.softAccent, borderColor: theme.colors.accent },
                  ]}>
                  <Pressable accessibilityRole="button" onPress={() => handleSelectGamePreset(gamePreset)} style={({ pressed }) => [styles.optionPressArea, pressed && styles.pressed]}>
                    <View style={styles.optionHeader}>
                      <Text style={[styles.optionTitle, isSelected && { color: theme.colors.secondaryText }]}>{gamePreset.title}</Text>
                      <Text style={[styles.optionMeta, isSelected && { color: theme.colors.secondaryText }]}>{gamePreset.category}</Text>
                    </View>
                    <Text style={[styles.optionDescription, isSelected && { color: theme.colors.secondaryText }]}>{gamePreset.description}</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={() => setRulesModalPresetId(gamePreset.id)} style={({ pressed }) => [styles.rulesButton, pressed && styles.pressed]}>
                    <Text style={styles.rulesButtonText}>{t('gameRules')}</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>{t('scoringStyle')}</Text>
          <View style={styles.optionList}>
            {scoringPresets.map((preset) => {
              const isSelected = preset.mode === scoringMode;

              return (
                <Pressable
                  accessibilityRole="button"
                  key={preset.mode}
                  onPress={() => handleSelectScoringMode(preset.mode)}
                  style={({ pressed }) => [
                    styles.optionCard,
                    isSelected && { backgroundColor: theme.colors.softAccent, borderColor: theme.colors.accent },
                    pressed && styles.pressed,
                  ]}>
                  <Text style={[styles.optionTitle, isSelected && { color: theme.colors.secondaryText }]}>{preset.title}</Text>
                  <Text style={[styles.optionDescription, isSelected && { color: theme.colors.secondaryText }]}>{preset.description}</Text>
                </Pressable>
              );
            })}
          </View>

          {needsTarget ? (
            <>
              <Text style={styles.label}>{selectedScoringPreset.inputLabel}</Text>
              <TextInput
                keyboardType="number-pad"
                onChangeText={setScoreTarget}
                placeholder={String(selectedScoringPreset.defaultTargetScore ?? DEFAULT_OUT_LIMIT)}
                placeholderTextColor="#94A3B8"
                style={styles.input}
                value={scoreTarget}
              />
            </>
          ) : null}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={handleSaveSettings}
          style={({ pressed }) => [styles.primaryButton, { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primaryShadow }, pressed && styles.pressed]}>
          <Text style={styles.primaryButtonText}>Save Settings</Text>
        </Pressable>
      </ScrollView>
      <Modal animationType="slide" onRequestClose={() => setRulesModalPresetId(null)} transparent visible={Boolean(rulesModalPreset)}>
        <View style={styles.rulesOverlay}>
          <View style={[styles.rulesSheet, { backgroundColor: theme.colors.screen }]}>
            {rulesModalPreset ? (
              <ScrollView contentContainerStyle={styles.rulesSheetContent}>
                <View style={[styles.rulesHero, { backgroundColor: theme.colors.hero }]}>
                  <Text style={[styles.kicker, { color: theme.colors.accent }]}>Game rules</Text>
                  <Text style={styles.rulesSheetTitle}>{rulesModalPreset.title}</Text>
                  <Text style={styles.rulesSheetSubtitle}>{rulesModalPreset.description}</Text>
                </View>
                <View style={styles.rulesCard}>
                  <Text style={styles.rulesLabel}>Objective</Text>
                  <Text style={styles.rulesText}>{rulesModalPreset.rules.objective}</Text>
                  <Text style={styles.rulesLabel}>Scoring</Text>
                  {rulesModalPreset.rules.scoring.map((rule) => (
                    <Text key={rule} style={styles.rulesText}>- {rule}</Text>
                  ))}
                  <Text style={styles.rulesLabel}>Winning</Text>
                  <Text style={styles.rulesText}>{rulesModalPreset.rules.winning}</Text>
                  {rulesModalPreset.rules.notes?.map((note) => (
                    <Text key={note} style={styles.rulesNote}>Note: {note}</Text>
                  ))}
                </View>
                <Pressable accessibilityRole="button" onPress={() => setRulesModalPresetId(null)} style={({ pressed }) => [styles.rulesCloseButton, { backgroundColor: theme.colors.primary }, pressed && styles.pressed]}>
                  <Text style={styles.rulesCloseButtonText}>{t('done')}</Text>
                </Pressable>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: '#EEF2F6',
  },
  screen: {
    backgroundColor: '#EEF2F6',
  },
  container: {
    flexGrow: 1,
    gap: 18,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F6F8',
    padding: 20,
  },
  heroCard: {
    gap: 8,
    borderRadius: 8,
    backgroundColor: '#172033',
    padding: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 5,
  },
  kicker: {
    color: '#66E3D2',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 29,
  },
  subtitle: {
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    gap: 9,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    padding: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 2,
  },
  label: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 4,
  },
  input: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D8DEE8',
    backgroundColor: '#F8FAFC',
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 12,
  },
  rulesOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  rulesSheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: '#EEF2F6',
    overflow: 'hidden',
  },
  rulesSheetContent: {
    gap: 14,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 28,
  },
  rulesHero: {
    gap: 6,
    borderRadius: 8,
    backgroundColor: '#172033',
    padding: 18,
  },
  rulesSheetTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34,
  },
  rulesSheetSubtitle: {
    color: '#CBD5E1',
    fontSize: 15,
    lineHeight: 21,
  },
  teamModePanel: {
    minHeight: 58,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    padding: 10,
  },
  teamModeTextBlock: {
    flex: 1,
    gap: 2,
  },
  teamModeTitle: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '900',
  },
  teamModeText: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 16,
  },
  teamSwitch: {
    minWidth: 58,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  teamSwitchText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '900',
  },
  teamSwitchTextActive: {
    color: '#FFFFFF',
  },
  teamSummaryTable: {
    gap: 6,
  },
  teamSummaryRow: {
    minHeight: 42,
    borderRadius: 8,
    backgroundColor: '#111827',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
  },
  teamSummaryName: {
    width: 72,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  teamSummaryPlayers: {
    flex: 1,
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '800',
  },
  addPlayerPanel: {
    flexDirection: 'row',
    gap: 8,
  },
  addPlayerInput: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D8DEE8',
    backgroundColor: '#F8FAFC',
    color: '#111827',
    fontSize: 14,
    fontWeight: '800',
    paddingHorizontal: 12,
  },
  addPlayerButton: {
    minWidth: 62,
    minHeight: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#14B8A6',
  },
  addPlayerButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  helperText: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 16,
  },
  playerTeamList: {
    gap: 8,
  },
  playerTeamRow: {
    minHeight: 54,
    borderRadius: 8,
    backgroundColor: '#F3F7FB',
    alignItems: 'stretch',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  playerTeamTextBlock: {
    flex: 1,
    gap: 3,
  },
  playerNameInput: {
    minHeight: 40,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    color: '#111827',
    fontSize: 14,
    fontWeight: '800',
    paddingHorizontal: 12,
  },
  playerTeamMeta: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
  },
  playerActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 8,
  },
  removePlayerButton: {
    borderRadius: 999,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  removePlayerButtonText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '900',
  },
  optionList: {
    gap: 10,
  },
  optionCard: {
    gap: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    padding: 14,
  },
  optionPressArea: {
    gap: 6,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  optionTitle: {
    flex: 1,
    color: '#111827',
    fontSize: 16,
    fontWeight: '900',
  },
  optionMeta: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  optionDescription: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
  },
  rulesButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  rulesButtonText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '900',
  },
  rulesCard: {
    gap: 7,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
  },
  rulesTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '900',
  },
  rulesLabel: {
    color: '#14B8A6',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  rulesText: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
  },
  rulesNote: {
    color: '#92400E',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
  },
  rulesCloseButton: {
    minHeight: 54,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F97316',
  },
  rulesCloseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  primaryButton: {
    minHeight: 46,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F97316',
    shadowColor: '#C2410C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  emptyTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.82,
  },
});
