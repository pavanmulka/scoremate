import { router, type Href, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  customGamePresetId,
  gamePresetCategories,
  gamePresets,
  getGamePreset,
  getGamePresetsByCategory,
  getRecentGamePresets,
  type GamePreset,
  type GamePresetCategoryFilter,
} from '@/features/matches/gamePresets';
import { createId } from '@/features/matches/matchFactory';
import { getMatches, saveMatch } from '@/features/matches/matchStorage';
import { clearSavedPlayers, deleteSavedPlayer, getSavedPlayers, savePlayerNames } from '@/features/matches/playerStorage';
import { DEFAULT_OUT_LIMIT, createScoringRule, getScoringPreset, modeNeedsTarget, scoringPresets } from '@/features/matches/scoringRules';
import { useScoreMateTheme } from '@/hooks/use-scoremate-theme';
import type { Match, Player, SavedPlayer, ScoringMode } from '@/features/matches/types';

const minimumTeamCount = 2;
const maximumTeamCount = 6;
const maximumPlayersPerTeam = 8;

type NameEditorState =
  | {
      type: 'player';
      playerId: string;
      value: string;
    }
  | {
      type: 'team';
      teamIndex: number;
      value: string;
    };

function getDefaultTeamName(teamIndex: number) {
  return `Team ${String.fromCharCode(65 + teamIndex)}`;
}

function getTeamLabels(count: number, existingLabels: string[]) {
  return Array.from({ length: count }, (_, index) => existingLabels[index] ?? getDefaultTeamName(index));
}

function clampNumber(value: number, minimumValue: number, maximumValue: number) {
  return Math.min(maximumValue, Math.max(minimumValue, value));
}

function trimTeamPlayers(players: Player[], labels: string[], playersPerTeam: number) {
  const teamCounts = new Map<string, number>();

  return players.filter((player) => {
    if (!player.teamName || !labels.includes(player.teamName)) {
      return false;
    }

    const nextCount = (teamCounts.get(player.teamName) ?? 0) + 1;
    teamCounts.set(player.teamName, nextCount);

    return nextCount <= playersPerTeam;
  });
}

function getGeneratedMatchName(matches: Match[]) {
  const existingNames = new Set(matches.map((match) => match.name.trim().toLowerCase()));
  let matchNumber = matches.length + 1;

  while (existingNames.has(`match ${matchNumber}`)) {
    matchNumber += 1;
  }

  return `Match ${matchNumber}`;
}

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function CreateMatchScreen() {
  const theme = useScoreMateTheme();
  const params = useLocalSearchParams();
  const playerNameInputRef = useRef<TextInput>(null);
  const requestedGamePresetId = getFirstParam(params.gamePresetId);
  const requestedScoringMode = getFirstParam(params.scoringMode);
  const initialGamePreset = getGamePreset(requestedGamePresetId);
  const initialScoringMode =
    initialGamePreset?.scoringMode ??
    (scoringPresets.some((preset) => preset.mode === requestedScoringMode) ? (requestedScoringMode as ScoringMode) : 'highestScoreWins');
  const initialScoreTarget = initialGamePreset?.targetScore ?? getScoringPreset(initialScoringMode).defaultTargetScore ?? DEFAULT_OUT_LIMIT;
  const [matchName, setMatchName] = useState('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedGamePresetId, setSelectedGamePresetId] = useState(initialGamePreset?.id ?? customGamePresetId);
  const [scoringMode, setScoringMode] = useState<ScoringMode>(initialScoringMode);
  const [scoreTarget, setScoreTarget] = useState(String(initialScoreTarget));
  const [playerName, setPlayerName] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [savedPlayers, setSavedPlayers] = useState<SavedPlayer[]>([]);
  const [teamMode, setTeamMode] = useState(false);
  const [teamCount, setTeamCount] = useState(2);
  const [playersPerTeam, setPlayersPerTeam] = useState(2);
  const [teamLabels, setTeamLabels] = useState(() => getTeamLabels(2, []));
  const [selectedGameCategory, setSelectedGameCategory] = useState<GamePresetCategoryFilter>('All');
  const [rulesModalPresetId, setRulesModalPresetId] = useState<string | null>(null);
  const [isGameLibraryOpen, setIsGameLibraryOpen] = useState(false);
  const [isScoringOpen, setIsScoringOpen] = useState(false);
  const [nameEditor, setNameEditor] = useState<NameEditorState | null>(null);

  const normalizedNames = useMemo(() => players.map((player) => player.name.trim().toLowerCase()), [players]);
  const selectedPreset = getScoringPreset(scoringMode);
  const needsTarget = modeNeedsTarget(scoringMode);
  const availableSavedPlayers = savedPlayers.filter((savedPlayer) => !normalizedNames.includes(savedPlayer.name.toLowerCase()));
  const recentGamePresets = useMemo(() => getRecentGamePresets(matches), [matches]);
  const visibleGamePresets = useMemo(
    () => (selectedGameCategory === 'Recent' ? recentGamePresets : getGamePresetsByCategory(selectedGameCategory)),
    [recentGamePresets, selectedGameCategory],
  );
  const selectedGamePreset = getGamePreset(selectedGamePresetId);
  const rulesModalPreset = getGamePreset(rulesModalPresetId);
  const activeTeamLabels = useMemo(() => getTeamLabels(teamCount, teamLabels), [teamCount, teamLabels]);
  const teamRows = useMemo(
    () =>
      activeTeamLabels.map((teamName, teamIndex) => {
        const teamPlayers = players.filter((player) => player.teamName === teamName);

        return {
          teamIndex,
          teamName,
          slots: Array.from({ length: playersPerTeam }, (_, slotIndex) => teamPlayers[slotIndex] ?? null),
        };
      }),
    [activeTeamLabels, players, playersPerTeam],
  );
  const nextTeamSlot = useMemo(() => {
    if (!teamMode) {
      return null;
    }

    for (const team of teamRows) {
      const emptySlotIndex = team.slots.findIndex((player) => !player);

      if (emptySlotIndex >= 0) {
        return {
          teamName: team.teamName,
          playerNumber: emptySlotIndex + 1,
        };
      }
    }

    return null;
  }, [teamMode, teamRows]);
  const playerInputPlaceholder = teamMode
    ? nextTeamSlot
      ? `${nextTeamSlot.teamName} player ${nextTeamSlot.playerNumber}`
      : 'All team slots filled'
    : 'Player name';

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      Promise.all([getSavedPlayers(), getMatches()]).then(([storedPlayers, storedMatches]) => {
        if (isActive) {
          setSavedPlayers(storedPlayers);
          setMatches(storedMatches);
        }
      });

      return () => {
        isActive = false;
      };
    }, []),
  );

  function handleSelectPreset(mode: ScoringMode) {
    const preset = getScoringPreset(mode);
    setSelectedGamePresetId(customGamePresetId);
    setScoringMode(mode);

    if (preset.defaultTargetScore) {
      setScoreTarget(String(preset.defaultTargetScore));
    }
  }

  function handleSelectGamePreset(gamePreset: GamePreset) {
    setSelectedGamePresetId(gamePreset.id);
    setScoringMode(gamePreset.scoringMode);

    if (gamePreset.targetScore) {
      setScoreTarget(String(gamePreset.targetScore));
    }

    setIsGameLibraryOpen(false);
  }

  function focusPlayerNameInput() {
    setTimeout(() => {
      playerNameInputRef.current?.focus();
    }, 50);
  }

  function handleAddPlayer() {
    const trimmedName = playerName.trim();

    if (!trimmedName) {
      Alert.alert('Player name required', 'Enter a player name.');
      return;
    }

    if (normalizedNames.includes(trimmedName.toLowerCase())) {
      Alert.alert('Duplicate player', 'Player names must be unique for this match.');
      return;
    }

    if (teamMode && !nextTeamSlot) {
      Alert.alert('Team slots full', 'Increase teams or players per team before adding another player.');
      return;
    }

    setPlayers((currentPlayers) => [...currentPlayers, { id: createId('player'), name: trimmedName, ...(teamMode && nextTeamSlot ? { teamName: nextTeamSlot.teamName } : {}) }]);
    setPlayerName('');

    if (!teamMode || players.length + 1 < teamCount * playersPerTeam) {
      focusPlayerNameInput();
    } else {
      Keyboard.dismiss();
    }
  }

  function handleAddSavedPlayer(savedPlayer: SavedPlayer) {
    if (normalizedNames.includes(savedPlayer.name.toLowerCase())) {
      return;
    }

    if (teamMode && !nextTeamSlot) {
      Alert.alert('Team slots full', 'Increase teams or players per team before adding another player.');
      return;
    }

    setPlayers((currentPlayers) => [...currentPlayers, { id: createId('player'), name: savedPlayer.name, ...(teamMode && nextTeamSlot ? { teamName: nextTeamSlot.teamName } : {}) }]);
  }

  function handleToggleTeamMode() {
    const nextValue = !teamMode;

    setTeamMode(nextValue);

    if (nextValue) {
      const requiredPlayersPerTeam = Math.max(playersPerTeam, Math.ceil(players.length / teamCount), 1);
      const labels = getTeamLabels(teamCount, teamLabels);

      setPlayersPerTeam(requiredPlayersPerTeam);
      setPlayers((currentPlayers) =>
        currentPlayers.map((player, index) => ({
          ...player,
          teamName: labels[Math.min(Math.floor(index / requiredPlayersPerTeam), labels.length - 1)],
        })),
      );
      return;
    }

    setPlayers((currentPlayers) => currentPlayers.map((player) => ({ id: player.id, name: player.name })));
  }

  function handleChangeTeamCount(nextCount: number) {
    const normalizedCount = clampNumber(nextCount, minimumTeamCount, maximumTeamCount);
    const nextLabels = getTeamLabels(normalizedCount, teamLabels);

    setTeamCount(normalizedCount);
    setTeamLabels(nextLabels);
    setPlayers((currentPlayers) => (teamMode ? trimTeamPlayers(currentPlayers, nextLabels, playersPerTeam) : currentPlayers));
  }

  function handleChangePlayersPerTeam(nextValue: number) {
    const normalizedPlayersPerTeam = clampNumber(nextValue, 1, maximumPlayersPerTeam);

    setPlayersPerTeam(normalizedPlayersPerTeam);
    setPlayers((currentPlayers) => (teamMode ? trimTeamPlayers(currentPlayers, activeTeamLabels, normalizedPlayersPerTeam) : currentPlayers));
  }

  function handlePlayerOptions(player: Player) {
    Alert.alert(player.name, 'Choose an action for this player.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Edit name',
        onPress: () => setNameEditor({ type: 'player', playerId: player.id, value: player.name }),
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => setPlayers((currentPlayers) => currentPlayers.filter((storedPlayer) => storedPlayer.id !== player.id)),
      },
    ]);
  }

  function handleSaveEditedName() {
    const trimmedName = nameEditor?.value.trim();

    if (!nameEditor || !trimmedName) {
      Alert.alert('Name required', 'Enter a name.');
      return;
    }

    if (nameEditor.type === 'player') {
      const duplicateName = players.some((player) => player.id !== nameEditor.playerId && player.name.trim().toLowerCase() === trimmedName.toLowerCase());

      if (duplicateName) {
        Alert.alert('Duplicate player', 'Player names must be unique for this match.');
        return;
      }

      setPlayers((currentPlayers) => currentPlayers.map((player) => (player.id === nameEditor.playerId ? { ...player, name: trimmedName } : player)));
      setNameEditor(null);
      return;
    }

    const currentTeamName = activeTeamLabels[nameEditor.teamIndex] ?? getDefaultTeamName(nameEditor.teamIndex);
    const duplicateTeamName = activeTeamLabels.some((teamName, teamIndex) => teamIndex !== nameEditor.teamIndex && teamName.toLowerCase() === trimmedName.toLowerCase());

    if (duplicateTeamName) {
      Alert.alert('Duplicate team', 'Team names must be unique.');
      return;
    }

    setTeamLabels((currentLabels) => {
      const nextLabels = getTeamLabels(teamCount, currentLabels);
      nextLabels[nameEditor.teamIndex] = trimmedName;
      return nextLabels;
    });
    setPlayers((currentPlayers) =>
      currentPlayers.map((player) => (player.teamName === currentTeamName ? { ...player, teamName: trimmedName } : player)),
    );
    setNameEditor(null);
  }

  function handleRemoveSavedPlayer(savedPlayer: SavedPlayer) {
    Alert.alert('Remove saved player?', `Remove "${savedPlayer.name}" from quick add?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const updatedPlayers = await deleteSavedPlayer(savedPlayer.id);
          setSavedPlayers(updatedPlayers);
        },
      },
    ]);
  }

  function handleClearSavedPlayers() {
    Alert.alert('Clear saved players?', 'This removes every name from quick add. Your existing matches will not change.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear all',
        style: 'destructive',
        onPress: async () => {
          const updatedPlayers = await clearSavedPlayers();
          setSavedPlayers(updatedPlayers);
        },
      },
    ]);
  }

  async function handleStartMatch() {
    const storedMatches = await getMatches();

    const trimmedName = matchName.trim() || getGeneratedMatchName(storedMatches);
    const parsedScoreTarget = Number(scoreTarget);

    if (needsTarget && (!Number.isFinite(parsedScoreTarget) || parsedScoreTarget <= 0)) {
      Alert.alert('Invalid score target', `${selectedPreset.inputLabel ?? 'Score target'} must be a number greater than 0.`);
      return;
    }

    if (players.length < 2) {
      Alert.alert('Add at least 2 players', 'Add at least 2 players to start.');
      return;
    }

    const matchPlayers: Player[] = teamMode ? players : players.map((player) => ({ id: player.id, name: player.name }));

    if (teamMode) {
      const activeTeams = new Set(matchPlayers.map((player) => player.teamName).filter(Boolean));

      if (activeTeams.size < 2) {
        Alert.alert('Add two teams', 'Team scoring needs at least one player on two teams.');
        return;
      }

      const incompleteTeam = activeTeamLabels.find((teamName) => matchPlayers.filter((player) => player.teamName === teamName).length !== playersPerTeam);

      if (incompleteTeam) {
        Alert.alert('Fill team slots', `${incompleteTeam} needs ${playersPerTeam} player${playersPerTeam === 1 ? '' : 's'}.`);
        return;
      }
    }

    const now = new Date().toISOString();
    const normalizedTarget = needsTarget ? Math.floor(parsedScoreTarget) : undefined;
    const match: Match = {
      id: createId('match'),
      name: trimmedName,
      outLimit: scoringMode === 'outLimit' ? normalizedTarget ?? DEFAULT_OUT_LIMIT : DEFAULT_OUT_LIMIT,
      scoringRule: createScoringRule(scoringMode, normalizedTarget),
      gamePresetId: selectedGamePresetId === customGamePresetId ? undefined : selectedGamePresetId,
      gamePresetName: selectedGamePresetId === customGamePresetId ? undefined : gamePresets.find((preset) => preset.id === selectedGamePresetId)?.shortTitle,
      status: 'active',
      players: matchPlayers,
      rounds: [],
      createdAt: now,
      updatedAt: now,
    };

    const savedMatch = await saveMatch(match);
    await savePlayerNames(matchPlayers.map((player) => player.name));
    router.replace(`/matches/scoreboard?matchId=${encodeURIComponent(savedMatch.id)}` as Href);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      style={[styles.keyboardView, { backgroundColor: theme.colors.screen }]}>
      <ScrollView
        style={[styles.screen, { backgroundColor: theme.colors.screen }]}
        contentContainerStyle={styles.container}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled">
      <View style={[styles.heroCard, { backgroundColor: theme.colors.hero }]}>
        <Text style={[styles.kicker, { color: theme.colors.accent }]}>New match</Text>
        <Text style={styles.title}>Create match</Text>
        <Text style={styles.subtitle}>Add players and start. Game rules and scoring options are available when needed.</Text>
      </View>

      <View style={styles.card}>
        <Pressable
          accessibilityLabel={isGameLibraryOpen ? 'Collapse game library' : 'Expand game library'}
          accessibilityRole="button"
          onPress={() => setIsGameLibraryOpen((value) => !value)}
          style={({ pressed }) => [
            styles.compactSectionHeader,
            { backgroundColor: theme.colors.cardTint, borderColor: theme.colors.border },
            isGameLibraryOpen && { borderColor: theme.colors.primary },
            pressed && styles.pressed,
          ]}>
          <View style={styles.compactSectionText}>
            <Text style={styles.label}>Select game</Text>
            <Text numberOfLines={1} style={styles.compactSectionHint}>{selectedGamePreset ? selectedGamePreset.title : 'Generic scorekeeper'}</Text>
          </View>
          {selectedGamePreset ? (
            <Pressable accessibilityRole="button" onPress={() => setRulesModalPresetId(selectedGamePreset.id)} style={({ pressed }) => [styles.rulesButton, pressed && styles.pressed]}>
              <Text style={styles.rulesButtonText}>Rules</Text>
            </Pressable>
          ) : null}
          <View style={styles.compactButton}>
            <Text style={styles.compactButtonText}>{isGameLibraryOpen ? '↑' : '↓'}</Text>
          </View>
        </Pressable>

        {isGameLibraryOpen ? (
          <>
            <View style={styles.categoryRow}>
              {gamePresetCategories.map((category) => {
                const isSelected = selectedGameCategory === category;

                return (
                  <Pressable
                    accessibilityRole="button"
                    key={category}
                    onPress={() => {
                      setSelectedGameCategory(category);
                    }}
                    style={({ pressed }) => [styles.categoryChip, isSelected && { backgroundColor: theme.colors.secondary, borderColor: theme.colors.secondaryText }, pressed && styles.pressed]}>
                    <Text style={[styles.categoryChipText, isSelected && { color: theme.colors.secondaryText }]}>{category}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.gamePresetList}>
              {selectedGameCategory === 'All' ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setSelectedGamePresetId(customGamePresetId);
                    setScoringMode('highestScoreWins');
                    setIsGameLibraryOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.gamePresetCard,
                    selectedGamePresetId === customGamePresetId && styles.gamePresetCardSelected,
                    selectedGamePresetId === customGamePresetId && { borderColor: theme.colors.accent, backgroundColor: theme.colors.softAccent },
                    pressed && styles.pressed,
                  ]}>
                  <Text style={[styles.gamePresetTitle, selectedGamePresetId === customGamePresetId && { color: theme.colors.secondaryText }]}>Generic scorekeeper</Text>
                  <Text style={[styles.gamePresetDescription, selectedGamePresetId === customGamePresetId && { color: theme.colors.secondaryText }]}>
                    Generic manual scoring. Highest score leads by default.
                  </Text>
                </Pressable>
              ) : null}

              {selectedGameCategory === 'Recent' && visibleGamePresets.length === 0 ? (
                <View style={styles.emptyGamePresetCard}>
                  <Text style={styles.emptyGamePresetTitle}>No recent games yet</Text>
                  <Text style={styles.emptyGamePresetText}>Start a game once and it will show here for faster setup next time.</Text>
                </View>
              ) : null}

              {visibleGamePresets.map((gamePreset) => {
                const isSelected = selectedGamePresetId === gamePreset.id;

                return (
                  <View
                    key={gamePreset.id}
                    style={[
                      styles.gamePresetCard,
                      isSelected && styles.gamePresetCardSelected,
                      isSelected && { borderColor: theme.colors.accent, backgroundColor: theme.colors.softAccent },
                    ]}>
                    <Pressable accessibilityRole="button" onPress={() => handleSelectGamePreset(gamePreset)} style={({ pressed }) => [styles.gamePresetSelectArea, pressed && styles.pressed]}>
                      <View style={styles.gamePresetHeader}>
                        <Text style={[styles.gamePresetTitle, isSelected && { color: theme.colors.secondaryText }]}>{gamePreset.title}</Text>
                        <Text style={[styles.gamePresetCategoryText, isSelected && { color: theme.colors.secondaryText }]}>{gamePreset.category}</Text>
                      </View>
                      <Text style={[styles.gamePresetDescription, isSelected && { color: theme.colors.secondaryText }]}>{gamePreset.description}</Text>
                    </Pressable>
                    <Pressable accessibilityRole="button" onPress={() => setRulesModalPresetId(gamePreset.id)} style={({ pressed }) => [styles.rulesButton, pressed && styles.pressed]}>
                      <Text style={styles.rulesButtonText}>Rules</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </>
        ) : null}

        <Pressable
          accessibilityLabel={isScoringOpen ? 'Collapse scoring styles' : 'Expand scoring styles'}
          accessibilityRole="button"
          onPress={() => setIsScoringOpen((value) => !value)}
          style={({ pressed }) => [
            styles.compactSectionHeader,
            { backgroundColor: theme.colors.cardTint, borderColor: theme.colors.border },
            isScoringOpen && { borderColor: theme.colors.primary },
            pressed && styles.pressed,
          ]}>
          <View style={styles.compactSectionText}>
            <Text style={styles.label}>Select scoring style</Text>
            <Text numberOfLines={1} style={styles.compactSectionHint}>{selectedPreset.title}</Text>
          </View>
          <View style={styles.compactButton}>
            <Text style={styles.compactButtonText}>{isScoringOpen ? '↑' : '↓'}</Text>
          </View>
        </Pressable>

        {isScoringOpen ? (
          <>
            <View style={styles.presetList}>
              {scoringPresets.map((preset) => {
                const isSelected = preset.mode === scoringMode;

                return (
                  <Pressable
                    accessibilityRole="button"
                    key={preset.mode}
                    onPress={() => handleSelectPreset(preset.mode)}
                    style={({ pressed }) => [
                      styles.presetCard,
                      isSelected && styles.presetCardSelected,
                      isSelected && { borderColor: theme.colors.accent, backgroundColor: theme.colors.softAccent },
                      pressed && styles.pressed,
                    ]}>
                    <View style={styles.presetTextBlock}>
                      <Text style={[styles.presetTitle, isSelected && styles.presetTitleSelected, isSelected && { color: theme.colors.secondaryText }]}>{preset.title}</Text>
                      <Text style={[styles.presetDescription, isSelected && styles.presetDescriptionSelected, isSelected && { color: theme.colors.secondaryText }]}>{preset.description}</Text>
                    </View>
                    <View style={[styles.presetDot, isSelected && styles.presetDotSelected, isSelected && { borderColor: theme.colors.secondaryText, backgroundColor: theme.colors.accent }]} />
                  </Pressable>
                );
              })}
            </View>

            {needsTarget ? (
              <>
                <Text style={styles.label}>{selectedPreset.inputLabel}</Text>
                <TextInput
                  keyboardType="number-pad"
                  onChangeText={setScoreTarget}
                  placeholder={String(selectedPreset.defaultTargetScore ?? DEFAULT_OUT_LIMIT)}
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                  value={scoreTarget}
                />
              </>
            ) : null}
          </>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Match name</Text>
        <TextInput
          autoCapitalize="words"
          onChangeText={setMatchName}
          onSubmitEditing={focusPlayerNameInput}
          placeholder="Optional - auto names Match 1"
          placeholderTextColor="#94A3B8"
          returnKeyType="next"
          style={styles.input}
          value={matchName}
        />
        <Text style={styles.helperText}>Leave blank to generate a simple name automatically.</Text>

        <View style={styles.teamModePanel}>
          <View style={styles.teamModeTextBlock}>
            <Text style={styles.teamModeTitle}>Scoring mode</Text>
            <Text style={styles.teamModeText}>{teamMode ? `${teamCount} teams - ${playersPerTeam} players each` : 'Individual players'}</Text>
          </View>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: teamMode }}
            onPress={handleToggleTeamMode}
            style={({ pressed }) => [styles.teamSwitch, teamMode && { backgroundColor: theme.colors.primary }, pressed && styles.pressed]}>
            <Text style={[styles.teamSwitchText, teamMode && styles.teamSwitchTextActive]}>{teamMode ? 'Teams' : 'Solo'}</Text>
          </Pressable>
        </View>

        {teamMode ? (
          <View style={styles.teamSetupPanel}>
            <View style={styles.teamSetupRow}>
              <View style={styles.stepperCard}>
                <Text style={styles.stepperLabel}>Teams</Text>
                <View style={styles.stepperControls}>
                  <Pressable accessibilityRole="button" onPress={() => handleChangeTeamCount(teamCount - 1)} style={({ pressed }) => [styles.stepperButton, pressed && styles.pressed]}>
                    <Text style={styles.stepperButtonText}>-</Text>
                  </Pressable>
                  <Text style={styles.stepperValue}>{teamCount}</Text>
                  <Pressable accessibilityRole="button" onPress={() => handleChangeTeamCount(teamCount + 1)} style={({ pressed }) => [styles.stepperButton, pressed && styles.pressed]}>
                    <Text style={styles.stepperButtonText}>+</Text>
                  </Pressable>
                </View>
              </View>
              <View style={styles.stepperCard}>
                <Text style={styles.stepperLabel}>Players/team</Text>
                <View style={styles.stepperControls}>
                  <Pressable accessibilityRole="button" onPress={() => handleChangePlayersPerTeam(playersPerTeam - 1)} style={({ pressed }) => [styles.stepperButton, pressed && styles.pressed]}>
                    <Text style={styles.stepperButtonText}>-</Text>
                  </Pressable>
                  <Text style={styles.stepperValue}>{playersPerTeam}</Text>
                  <Pressable accessibilityRole="button" onPress={() => handleChangePlayersPerTeam(playersPerTeam + 1)} style={({ pressed }) => [styles.stepperButton, pressed && styles.pressed]}>
                    <Text style={styles.stepperButtonText}>+</Text>
                  </Pressable>
                </View>
              </View>
            </View>
            <Text style={styles.helperText}>Long press a team or player name to edit. Long press a player to delete.</Text>
          </View>
        ) : null}

        <Text style={styles.label}>Players</Text>
        <View style={styles.addRow}>
          <TextInput
            autoCapitalize="words"
            blurOnSubmit={false}
            editable={!teamMode || Boolean(nextTeamSlot)}
            onChangeText={setPlayerName}
            onSubmitEditing={handleAddPlayer}
            placeholder={playerInputPlaceholder}
            placeholderTextColor="#94A3B8"
            ref={playerNameInputRef}
            returnKeyType="next"
            style={[styles.playerInput, teamMode && !nextTeamSlot && styles.disabledPlayerInput]}
            value={playerName}
          />
          <Pressable accessibilityRole="button" onPress={handleAddPlayer} style={({ pressed }) => [styles.addButton, { backgroundColor: theme.colors.primary }, pressed && styles.pressed]}>
            <Text style={styles.addButtonText}>+ Add</Text>
          </Pressable>
        </View>

        {availableSavedPlayers.length > 0 ? (
          <View style={styles.savedPlayersPanel}>
            <View style={styles.savedPlayersHeader}>
              <Text style={styles.savedPlayersTitle}>Quick add saved players</Text>
              <Pressable accessibilityRole="button" onPress={handleClearSavedPlayers} style={({ pressed }) => [styles.clearSavedPlayersButton, pressed && styles.pressed]}>
                <Text style={styles.clearSavedPlayersButtonText}>Clear all</Text>
              </Pressable>
            </View>
            <View style={styles.savedPlayerChips}>
              {availableSavedPlayers.slice(0, 12).map((savedPlayer) => (
                <Pressable
                  accessibilityHint="Long press to remove this saved player"
                  accessibilityRole="button"
                  key={savedPlayer.id}
                  onLongPress={() => handleRemoveSavedPlayer(savedPlayer)}
                  onPress={() => handleAddSavedPlayer(savedPlayer)}
                  style={({ pressed }) => [styles.savedPlayerChip, { backgroundColor: theme.colors.secondary }, pressed && styles.pressed]}>
                  <Text style={[styles.savedPlayerChipText, { color: theme.colors.secondaryText }]}>{savedPlayer.name}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {teamMode ? (
          <View style={styles.teamTable}>
            {teamRows.map((team) => (
              <View key={team.teamName} style={styles.teamRosterRow}>
                <Pressable
                  accessibilityHint="Long press to edit team name"
                  accessibilityRole="button"
                  onLongPress={() => setNameEditor({ type: 'team', teamIndex: team.teamIndex, value: team.teamName })}
                  style={({ pressed }) => [styles.teamRosterHeader, pressed && styles.pressed]}>
                  <Text style={styles.teamRosterName}>{team.teamName}</Text>
                  <Text style={styles.teamRosterMeta}>
                    {team.slots.filter(Boolean).length}/{playersPerTeam}
                  </Text>
                </Pressable>
                <View style={styles.teamRosterSlots}>
                  {team.slots.map((player, slotIndex) =>
                    player ? (
                      <Pressable
                        accessibilityHint="Long press to edit or delete this player"
                        accessibilityRole="button"
                        key={player.id}
                        onLongPress={() => handlePlayerOptions(player)}
                        style={({ pressed }) => [styles.teamPlayerCell, pressed && styles.pressed]}>
                        <Text style={styles.teamPlayerName} numberOfLines={1}>{player.name}</Text>
                        <Text style={styles.teamPlayerMeta}>P{slotIndex + 1}</Text>
                      </Pressable>
                    ) : (
                      <View key={`${team.teamName}-${slotIndex}`} style={styles.emptyTeamPlayerCell}>
                        <Text style={styles.emptyTeamPlayerText}>P{slotIndex + 1}</Text>
                      </View>
                    ),
                  )}
                </View>
              </View>
            ))}
          </View>
        ) : players.length === 0 ? (
          <View style={styles.inlineEmpty}>
            <Text style={styles.inlineEmptyText}>Add at least two players.</Text>
          </View>
        ) : (
          <View style={styles.playersList}>
            {players.map((player, index) => (
              <View key={player.id} style={styles.playerRow}>
                <View style={styles.playerTextBlock}>
                  <Text style={styles.playerName}>{player.name}</Text>
                  <Text style={styles.playerMeta}>Player {index + 1}</Text>
                </View>
                <View style={styles.playerActions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setNameEditor({ type: 'player', playerId: player.id, value: player.name })}
                    style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}>
                    <Text style={styles.editButtonText}>Edit</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setPlayers((currentPlayers) => currentPlayers.filter((storedPlayer) => storedPlayer.id !== player.id))}
                    style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}>
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      <Pressable accessibilityRole="button" onPress={handleStartMatch} style={({ pressed }) => [styles.primaryButton, { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primaryShadow }, pressed && styles.pressed]}>
        <Text style={styles.primaryButtonText}>Start Match</Text>
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
                  <Text style={styles.rulesCloseButtonText}>Done</Text>
                </Pressable>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
      <Modal animationType="fade" onRequestClose={() => setNameEditor(null)} transparent visible={Boolean(nameEditor)}>
        <View style={styles.nameEditorOverlay}>
          <View style={styles.nameEditorCard}>
            <Text style={styles.nameEditorTitle}>{nameEditor?.type === 'team' ? 'Edit team name' : 'Edit player name'}</Text>
            <TextInput
              autoCapitalize="words"
              onChangeText={(value) => setNameEditor((currentEditor) => (currentEditor ? { ...currentEditor, value } : currentEditor))}
              placeholder="Name"
              placeholderTextColor="#94A3B8"
              style={styles.nameEditorInput}
              value={nameEditor?.value ?? ''}
            />
            <View style={styles.nameEditorActions}>
              <Pressable accessibilityRole="button" onPress={() => setNameEditor(null)} style={({ pressed }) => [styles.nameEditorSecondaryButton, pressed && styles.pressed]}>
                <Text style={styles.nameEditorSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={handleSaveEditedName} style={({ pressed }) => [styles.nameEditorPrimaryButton, { backgroundColor: theme.colors.primary }, pressed && styles.pressed]}>
                <Text style={styles.nameEditorPrimaryText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
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
    gap: 12,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 26,
  },
  heroCard: {
    gap: 6,
    borderRadius: 8,
    backgroundColor: '#172033',
    padding: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
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
    fontWeight: '800',
    marginTop: 2,
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
  helperText: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 16,
  },
  compactSectionHeader: {
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    padding: 10,
  },
  compactSectionText: {
    flex: 1,
    gap: 3,
  },
  compactSectionHint: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '800',
  },
  compactButton: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
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
  gamePresetList: {
    gap: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 6,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingBottom: 4,
  },
  categoryChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  categoryChipText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '900',
  },
  gamePresetCard: {
    gap: 4,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  emptyGamePresetCard: {
    gap: 4,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    padding: 10,
  },
  emptyGamePresetTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
  },
  emptyGamePresetText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  gamePresetCardSelected: {
    backgroundColor: '#ECFDF5',
  },
  gamePresetSelectArea: {
    gap: 4,
  },
  gamePresetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  gamePresetTitle: {
    flex: 1,
    color: '#111827',
    fontSize: 13,
    fontWeight: '900',
  },
  gamePresetCategoryText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  gamePresetDescription: {
    color: '#64748B',
    fontSize: 11,
    lineHeight: 15,
  },
  rulesButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
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
  presetList: {
    gap: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 6,
  },
  presetCard: {
    minHeight: 50,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  presetCardSelected: {
    backgroundColor: '#ECFDF5',
  },
  presetTextBlock: {
    flex: 1,
    gap: 4,
  },
  presetTitle: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '900',
  },
  presetTitleSelected: {
    color: '#0F766E',
  },
  presetDescription: {
    color: '#64748B',
    fontSize: 11,
    lineHeight: 15,
  },
  presetDescriptionSelected: {
    color: '#0F766E',
  },
  presetDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#CBD5E1',
  },
  presetDotSelected: {
    borderColor: '#0F766E',
    backgroundColor: '#14B8A6',
  },
  addRow: {
    flexDirection: 'row',
    gap: 8,
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
    minWidth: 64,
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
  teamSetupPanel: {
    gap: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
  },
  teamSetupRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stepperCard: {
    flex: 1,
    gap: 6,
  },
  stepperLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  stepperControls: {
    minHeight: 38,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  stepperButton: {
    width: 38,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  stepperButtonText: {
    color: '#334155',
    fontSize: 18,
    fontWeight: '900',
  },
  stepperValue: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '900',
  },
  teamTable: {
    gap: 8,
  },
  teamRosterRow: {
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  teamRosterHeader: {
    minHeight: 36,
    backgroundColor: '#111827',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 10,
  },
  teamRosterName: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  teamRosterMeta: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '900',
  },
  teamRosterSlots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    padding: 8,
  },
  teamPlayerCell: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 92,
    minHeight: 40,
    borderRadius: 8,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    paddingHorizontal: 9,
  },
  teamPlayerName: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '900',
  },
  teamPlayerMeta: {
    color: '#0369A1',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  emptyTeamPlayerCell: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 92,
    minHeight: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTeamPlayerText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '900',
  },
  savedPlayersPanel: {
    gap: 10,
    borderRadius: 8,
    backgroundColor: '#F3F7FB',
    padding: 12,
  },
  savedPlayersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  savedPlayersTitle: {
    flex: 1,
    color: '#334155',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  clearSavedPlayersButton: {
    borderRadius: 999,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  clearSavedPlayersButtonText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '900',
  },
  savedPlayerChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  savedPlayerChip: {
    borderRadius: 999,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  savedPlayerChipText: {
    color: '#0369A1',
    fontSize: 14,
    fontWeight: '900',
  },
  playerInput: {
    flex: 1,
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
  disabledPlayerInput: {
    backgroundColor: '#E8EEF5',
    color: '#94A3B8',
  },
  addButton: {
    minWidth: 74,
    minHeight: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#14B8A6',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  inlineEmpty: {
    borderRadius: 8,
    backgroundColor: '#F3F7FB',
    padding: 14,
  },
  inlineEmptyText: {
    color: '#64748B',
    fontSize: 15,
    lineHeight: 22,
  },
  playersList: {
    gap: 8,
  },
  playerRow: {
    minHeight: 54,
    borderRadius: 8,
    backgroundColor: '#F3F7FB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 10,
  },
  playerName: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
  },
  playerTextBlock: {
    flex: 1,
    gap: 3,
  },
  playerMeta: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  playerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    borderRadius: 8,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  editButtonText: {
    color: '#0369A1',
    fontSize: 12,
    fontWeight: '900',
  },
  deleteButton: {
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  deleteButtonText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '800',
  },
  primaryButton: {
    minHeight: 44,
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
    fontSize: 15,
    fontWeight: '800',
  },
  nameEditorOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  nameEditorCard: {
    width: '100%',
    maxWidth: 420,
    gap: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    padding: 14,
  },
  nameEditorTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
  },
  nameEditorInput: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
    paddingHorizontal: 12,
  },
  nameEditorActions: {
    flexDirection: 'row',
    gap: 8,
  },
  nameEditorSecondaryButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  nameEditorSecondaryText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '900',
  },
  nameEditorPrimaryButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F97316',
  },
  nameEditorPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.82,
  },
});
