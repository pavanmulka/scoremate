import { useFocusEffect, router, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import { getGamePreset } from '@/features/matches/gamePresets';
import { createId, createReplayMatch } from '@/features/matches/matchFactory';
import { addRound, deleteRound, getMatch, saveMatch } from '@/features/matches/matchStorage';
import { savePlayerNames } from '@/features/matches/playerStorage';
import { clearRoundDraft, getRoundDraft, saveRoundDraft } from '@/features/matches/roundDraftStorage';
import { getScoringPreset, getScoringRule, getScoringRuleSummary, isLowerScoreBetter, modeNeedsTarget } from '@/features/matches/scoringRules';
import { getMatchInsights, getPlayerStandings, getTeamStandings, hasTeamScoring } from '@/features/matches/scoreCalculator';
import { formatMatchShareText } from '@/features/matches/shareFormatter';
import { useKeyboardBottomInset } from '@/hooks/use-keyboard-bottom-inset';
import { useScoreMateTheme } from '@/hooks/use-scoremate-theme';
import { useI18n } from '@/src/i18n';
import type { Match, PlayerScore, PlayerStanding, Round } from '@/features/matches/types';

function parseScore(value: string) {
  if (value.trim() === '') {
    return 0;
  }

  const score = Number(value);
  return Number.isFinite(score) && score >= 0 ? score : null;
}

function formatRoundScore(match: Match, round: Round) {
  return match.players
    .map((player) => {
      const score = round.scores.find((playerScore) => playerScore.playerId === player.id)?.score ?? 0;
      return `${player.name}: ${score}`;
    })
    .join('  -  ');
}

function getRoundScanSummary(match: Match, round: Round) {
  if (round.scores.length === 0) {
    return 'No scores';
  }

  const lowerScoreBetter = isLowerScoreBetter(getScoringRule(match).mode);
  const roundTotal = round.scores.reduce((total, score) => total + score.score, 0);
  const bestScore = lowerScoreBetter ? Math.min(...round.scores.map((score) => score.score)) : Math.max(...round.scores.map((score) => score.score));
  const bestPlayers = round.scores
    .filter((score) => score.score === bestScore)
    .map((score) => match.players.find((player) => player.id === score.playerId)?.name)
    .filter((name): name is string => Boolean(name));

  return `Round total ${roundTotal} - Best ${bestPlayers.join(', ')} ${bestScore}`;
}

function getFirstActivePlayerId(match: Match) {
  return getPlayerStandings(match).find((standing) => !standing.isOut)?.player.id ?? null;
}

function formatDraftSavedLabel(updatedAt: string) {
  const savedAt = new Date(updatedAt);

  if (Number.isNaN(savedAt.getTime())) {
    return 'Draft autosaved';
  }

  return `Draft autosaved ${savedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
}

export default function ScoreboardScreen() {
  const theme = useScoreMateTheme();
  const { t } = useI18n();
  const keyboardBottomInset = useKeyboardBottomInset();
  const { matchId } = useLocalSearchParams<{ matchId?: string }>();
  const [match, setMatch] = useState<Match | null>(null);
  const [scoresByPlayer, setScoresByPlayer] = useState<Record<string, string>>({});
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [isEditingLimit, setIsEditingLimit] = useState(false);
  const [outLimitDraft, setOutLimitDraft] = useState('');
  const [isSummaryVisible, setIsSummaryVisible] = useState(false);
  const [isRoundDraftHydrated, setIsRoundDraftHydrated] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);

  const loadMatch = useCallback(() => {
    let isActive = true;

    if (matchId) {
      setIsRoundDraftHydrated(false);

      Promise.all([getMatch(matchId), getRoundDraft(matchId)]).then(([storedMatch, storedRoundDraft]) => {
        if (isActive) {
          setMatch(storedMatch);
          setOutLimitDraft(storedMatch ? String(getScoringRule(storedMatch).targetScore ?? storedMatch.outLimit) : '');

          if (storedMatch && storedMatch.status !== 'completed' && storedRoundDraft) {
            setScoresByPlayer(storedRoundDraft.scoresByPlayer);
            setSelectedPlayerId(storedRoundDraft.selectedPlayerId ?? getFirstActivePlayerId(storedMatch));
            setDraftSavedAt(storedRoundDraft.updatedAt);
          } else {
            setScoresByPlayer({});
            setSelectedPlayerId(storedMatch ? getFirstActivePlayerId(storedMatch) : null);
            setDraftSavedAt(null);
          }

          setIsRoundDraftHydrated(true);
        }
      });
    }

    return () => {
      isActive = false;
    };
  }, [matchId]);

  useFocusEffect(loadMatch);

  useEffect(() => {
    if (!matchId || !match || !isRoundDraftHydrated || match.status === 'completed') {
      return;
    }

    let isActive = true;

    saveRoundDraft(matchId, scoresByPlayer, selectedPlayerId).then((savedDraft) => {
      if (isActive) {
        setDraftSavedAt(savedDraft?.updatedAt ?? null);
      }
    });

    return () => {
      isActive = false;
    };
  }, [isRoundDraftHydrated, match, matchId, scoresByPlayer, selectedPlayerId]);

  async function handleDeleteRound(roundId: string) {
    if (!matchId) {
      return;
    }

    if (match?.status === 'completed') {
      Alert.alert('Match completed', 'Reopen this match before editing rounds.');
      return;
    }

    Alert.alert('Delete round?', 'This will remove the round and recalculate totals.', [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          const updatedMatch = await deleteRound(matchId, roundId);
          setMatch(updatedMatch);
        },
      },
    ]);
  }

  async function handleSaveRound() {
    if (!match || !matchId) {
      return;
    }

    if (match.status === 'completed') {
      Alert.alert('Match completed', 'Reopen this match before adding rounds.');
      return;
    }

    const standings = getPlayerStandings(match);
    const activeStandings = standings.filter((standing) => !standing.isOut);

    if (activeStandings.length === 0) {
      Alert.alert('No active players', 'There are no active players left to score.');
      return;
    }

    const roundScores: PlayerScore[] = [];

    for (const standing of activeStandings) {
      const parsedScore = parseScore(scoresByPlayer[standing.player.id] ?? '');

      if (parsedScore === null) {
        Alert.alert('Invalid score', `${standing.player.name}'s score must be a number greater than or equal to 0.`);
        return;
      }

      roundScores.push({
        playerId: standing.player.id,
        score: parsedScore,
      });
    }

    const round: Round = {
      id: createId('round'),
      createdAt: new Date().toISOString(),
      scores: roundScores,
    };

    const updatedMatch = await addRound(matchId, round);
    await clearRoundDraft(matchId);
    setMatch(updatedMatch);
    setScoresByPlayer({});
    setDraftSavedAt(null);
    setSelectedPlayerId(updatedMatch ? getPlayerStandings(updatedMatch).find((standing) => !standing.isOut)?.player.id ?? null : null);
  }

  async function handleUndoLastRound() {
    if (!match || !matchId || match.rounds.length === 0) {
      return;
    }

    if (match.status === 'completed') {
      Alert.alert('Match completed', 'Reopen this match before undoing rounds.');
      return;
    }

    const lastRound = match.rounds[match.rounds.length - 1];
    const restoredScores = Object.fromEntries(lastRound.scores.map((score) => [score.playerId, String(score.score)]));
    const updatedMatch = await deleteRound(matchId, lastRound.id);

    setMatch(updatedMatch);
    setScoresByPlayer(restoredScores);
    setSelectedPlayerId(lastRound.scores[0]?.playerId ?? updatedMatch?.players[0]?.id ?? null);
  }

  async function handleSaveOutLimit() {
    if (!match) {
      return;
    }

    const rule = getScoringRule(match);
    const parsedOutLimit = Number(outLimitDraft);

    if (!Number.isFinite(parsedOutLimit) || parsedOutLimit <= 0) {
      Alert.alert('Invalid score target', 'Score target must be a number greater than 0.');
      return;
    }

    const targetScore = Math.floor(parsedOutLimit);
    const updatedMatch = await saveMatch({
      ...match,
      outLimit: rule.mode === 'outLimit' ? targetScore : match.outLimit,
      scoringRule: {
        ...rule,
        targetScore,
      },
    });

    setMatch(updatedMatch);
    setOutLimitDraft(String(targetScore));
    setIsEditingLimit(false);
  }

  function handleEndMatchSummary() {
    if (!match) {
      return;
    }

    setIsSummaryVisible(true);
  }

  async function handleShareSummary() {
    if (!match) {
      return;
    }

    try {
      await Share.share({
        message: formatMatchShareText(match),
        title: `${match.name} scoreboard`,
      });
    } catch {
      Alert.alert('Share failed', 'Could not open the share sheet. Try again.');
    }
  }

  async function handleCompleteMatch() {
    if (!match) {
      return;
    }

    const updatedMatch = await saveMatch({
      ...match,
      status: 'completed',
      completedAt: new Date().toISOString(),
    });

    await clearRoundDraft(match.id);
    setMatch(updatedMatch);
    setScoresByPlayer({});
    setDraftSavedAt(null);
    setSelectedPlayerId(null);
  }

  function handleReopenMatch() {
    if (!match) {
      return;
    }

    Alert.alert('Reopen match?', 'Score entry and round editing will be available again.', [
      { text: t('cancel'), style: 'cancel' },
      {
        text: 'Reopen',
        onPress: async () => {
          const updatedMatch = await saveMatch({
            ...match,
            status: 'active',
            completedAt: undefined,
          });

          setMatch(updatedMatch);
        },
      },
    ]);
  }

  async function handlePlayAgain() {
    if (!match) {
      return;
    }

    const replayMatch = createReplayMatch(match);

    const savedMatch = await saveMatch(replayMatch);
    await savePlayerNames(replayMatch.players.map((player) => player.name));
    router.replace(`/matches/scoreboard?matchId=${encodeURIComponent(savedMatch.id)}` as Href);
  }

  function handleSelectPlayer(playerId: string) {
    setSelectedPlayerId(playerId);
  }

  async function handleClearRoundDraft() {
    setScoresByPlayer({});
    setSelectedPlayerId(activeStandings[0]?.player.id ?? null);
    setDraftSavedAt(null);

    if (matchId) {
      await clearRoundDraft(matchId);
    }
  }

  function handleScoreChange(playerId: string, score: string) {
    const numericScore = score.replace(/\D/g, '').slice(0, 5);
    setScoresByPlayer((currentScores) => ({
      ...currentScores,
      [playerId]: numericScore,
    }));
    setSelectedPlayerId(playerId);
  }

  if (!match || !matchId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>Match not found</Text>
      </View>
    );
  }

  const standings = getPlayerStandings(match);
  const teamStandings = getTeamStandings(match);
  const isTeamMatch = hasTeamScoring(match);
  const activeStandings = standings.filter((standing) => !standing.isOut);
  const winner = standings.find((standing) => standing.isWinner);
  const isCompleted = match.status === 'completed';
  const scoringRule = getScoringRule(match);
  const scoringPreset = getScoringPreset(scoringRule.mode);
  const canEditScoreTarget = modeNeedsTarget(scoringRule.mode);
  const scoringRuleSummary = getScoringRuleSummary(match);
  const gamePresetLabel = match.gamePresetName ?? getGamePreset(match.gamePresetId)?.shortTitle;
  const matchInsights = getMatchInsights(match);
  const sortedRoundBestCounts = [...matchInsights.roundBestCounts].sort((first, second) => {
    if (second.count !== first.count) {
      return second.count - first.count;
    }

    return first.playerName.localeCompare(second.playerName);
  });
  const teamScoreRows = Array.from(new Set(match.players.map((player) => player.teamName).filter((teamName): teamName is string => Boolean(teamName)))).map((teamName) => {
    const teamStanding = teamStandings.find((team) => team.teamName === teamName);
    const playerStandings = standings.filter((standing) => standing.player.teamName === teamName);

    return {
      teamName,
      total: teamStanding?.total ?? playerStandings.reduce((total, standing) => total + standing.total, 0),
      isLeader: Boolean(teamStanding?.isLeader),
      players: playerStandings,
    };
  });

  function renderScoreEntryCell(standing: PlayerStanding) {
    const isSelected = selectedPlayerId === standing.player.id;

    return (
      <View key={standing.player.id} style={[styles.scoreEntryCard, isSelected && styles.selectedEntryCard, standing.isOut && styles.disabledEntryCard]}>
        <View style={styles.scoreEntryCardTop}>
          <View style={styles.scoreEntryPlayer}>
            <Text numberOfLines={1} style={[styles.scoreEntryName, standing.isOut && styles.disabledText]}>{standing.player.name}</Text>
            <Text style={[styles.scoreEntryMeta, standing.isOut && styles.disabledText]}>{standing.isOut ? 'Out' : `Total ${standing.total}`}</Text>
          </View>
          <TextInput
            editable={!standing.isOut}
            keyboardType="number-pad"
            onChangeText={(score) => handleScoreChange(standing.player.id, score)}
            onFocus={() => handleSelectPlayer(standing.player.id)}
            placeholder="0"
            placeholderTextColor="#94A3B8"
            style={[styles.scoreInput, isSelected && styles.selectedScoreInput, standing.isOut && styles.disabledInput]}
            value={scoresByPlayer[standing.player.id] ?? ''}
          />
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.keyboardView, { backgroundColor: theme.colors.screen }]}>
      <ScrollView
        style={[styles.screen, { backgroundColor: theme.colors.screen }]}
        contentContainerStyle={[styles.container, keyboardBottomInset > 0 && { paddingBottom: keyboardBottomInset + 26 }]}
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        keyboardShouldPersistTaps="handled">
      <View style={[styles.heroCard, { backgroundColor: theme.colors.hero }]}>
        <View style={styles.heroTopRow}>
          <Text style={styles.title} numberOfLines={1}>{match.name}</Text>
          <View style={styles.pillStack}>
            <View style={[styles.statusPill, isCompleted ? styles.completedPill : styles.livePill]}>
              <Text style={[styles.statusPillText, isCompleted ? styles.completedPillText : styles.livePillText]}>{isCompleted ? 'Completed' : 'Live'}</Text>
            </View>
            <View style={[styles.roundPill, { backgroundColor: theme.colors.heroMuted }]}>
              <Text style={styles.roundPillText}>{match.rounds.length} rounds</Text>
            </View>
          </View>
        </View>

        <View style={styles.limitPanel}>
          {isEditingLimit ? (
            <>
              <View style={styles.limitTextBlock}>
                <Text style={styles.limitLabel}>{scoringPreset.inputLabel}</Text>
              <TextInput
                keyboardType="number-pad"
                onChangeText={setOutLimitDraft}
                placeholder="300"
                placeholderTextColor="#94A3B8"
                style={styles.limitInput}
                value={outLimitDraft}
              />
              </View>
              <View style={styles.limitActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setOutLimitDraft(String(scoringRule.targetScore ?? match.outLimit));
                    setIsEditingLimit(false);
                  }}
                  style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
                  <Text style={styles.secondaryButtonText}>{t('cancel')}</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={handleSaveOutLimit} style={({ pressed }) => [styles.saveLimitButton, pressed && styles.pressed]}>
                  <Text style={styles.saveLimitButtonText}>Save</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <View style={styles.limitTextBlock}>
                <Text style={styles.limitLabel}>Scoring</Text>
                <Text style={styles.limitValue} numberOfLines={1}>{scoringRuleSummary}</Text>
              </View>
              {gamePresetLabel ? (
                <View style={[styles.ruleSummaryPill, { backgroundColor: theme.colors.heroMuted }]}>
                  <Text style={styles.ruleSummaryPillText}>{gamePresetLabel}</Text>
                </View>
              ) : null}
              {canEditScoreTarget ? (
                <Pressable accessibilityRole="button" onPress={() => setIsEditingLimit(true)} style={({ pressed }) => [styles.editLimitButton, { backgroundColor: theme.colors.cardTint }, pressed && styles.pressed]}>
                  <Text style={[styles.editLimitButtonText, { color: theme.colors.primaryShadow }]}>{t('edit')}</Text>
                </Pressable>
              ) : null}
            </>
          )}
        </View>

        <View style={styles.heroActions}>
          <Pressable accessibilityRole="button" onPress={handleEndMatchSummary} style={({ pressed }) => [styles.summaryButton, { backgroundColor: theme.colors.primary }, pressed && styles.pressed]}>
            <Text style={styles.summaryButtonText}>{isCompleted || winner ? t('summary') : t('end')}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={handleShareSummary} style={({ pressed }) => [styles.shareButton, { backgroundColor: theme.colors.secondary }, pressed && styles.pressed]}>
            <Text style={[styles.shareButtonText, { color: theme.colors.secondaryText }]}>{t('share')}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/matches/settings?matchId=${encodeURIComponent(matchId)}` as Href)}
            style={({ pressed }) => [styles.settingsButton, { backgroundColor: theme.colors.softAccent }, pressed && styles.pressed]}>
            <Text style={[styles.settingsButtonText, { color: theme.colors.secondaryText }]}>{t('settings')}</Text>
          </Pressable>
          {isCompleted ? (
            <Pressable accessibilityRole="button" onPress={handleReopenMatch} style={({ pressed }) => [styles.reopenButton, { backgroundColor: theme.colors.secondary }, pressed && styles.pressed]}>
              <Text style={[styles.reopenButtonText, { color: theme.colors.secondaryText }]}>{t('reopen')}</Text>
            </Pressable>
          ) : null}
          <Pressable accessibilityRole="button" onPress={handlePlayAgain} style={({ pressed }) => [styles.playAgainButton, { backgroundColor: theme.colors.primary }, pressed && styles.pressed]}>
            <Text style={styles.playAgainButtonText}>{t('replay')}</Text>
          </Pressable>
        </View>
      </View>

      {isCompleted ? (
        <View style={[styles.completedBanner, { backgroundColor: theme.colors.cardTint, borderColor: theme.colors.border }]}>
          <Text style={styles.completedBannerLabel}>Completed</Text>
          <Text style={styles.completedBannerTitle}>{winner ? `Winner: ${winner.player.name}` : 'Match saved to history'}</Text>
          <Text style={styles.completedBannerText}>Score entry is locked. Reopen the match to add, edit, or undo rounds.</Text>
        </View>
      ) : winner ? (
        <View style={styles.winnerBanner}>
          <Text style={styles.winnerBannerLabel}>Winner</Text>
          <Text style={styles.winnerBannerName}>{winner.player.name}</Text>
        </View>
      ) : (
        <View style={styles.entryCard}>
          <View style={styles.entryHeader}>
            <Text style={styles.entryTitle}>New round</Text>
            <Text style={styles.entryHint}>Enter each active player score. Empty scores save as 0.</Text>
            {draftSavedAt ? <Text style={styles.draftSavedText}>{formatDraftSavedLabel(draftSavedAt)}</Text> : null}
          </View>

          {isTeamMatch ? (
            <View style={styles.teamEntryList}>
              {teamScoreRows.map((team) => (
                <View key={team.teamName} style={[styles.teamEntryGroup, team.isLeader && styles.teamEntryLeaderGroup]}>
                  <View style={[styles.teamEntryHeader, team.isLeader && styles.teamEntryLeaderHeader]}>
                    <View style={styles.teamEntryHeaderText}>
                      <Text style={styles.teamEntryName}>{team.teamName}</Text>
                      <Text style={styles.teamEntryMeta}>{team.isLeader ? 'Leader' : `${team.players.length} players`}</Text>
                    </View>
                    <Text style={styles.teamEntryTotal}>{team.total}</Text>
                  </View>
                  <View style={styles.scoreEntryGrid}>{team.players.map((standing) => renderScoreEntryCell(standing))}</View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.scoreEntryGrid}>{standings.map((standing) => renderScoreEntryCell(standing))}</View>
          )}

          <View style={styles.roundActionRow}>
            <Pressable accessibilityRole="button" onPress={handleClearRoundDraft} style={({ pressed }) => [styles.clearDraftButton, pressed && styles.pressed]}>
              <Text style={styles.clearDraftButtonText}>{t('clear')}</Text>
            </Pressable>
            {match.rounds.length > 0 ? (
              <Pressable accessibilityRole="button" onPress={handleUndoLastRound} style={({ pressed }) => [styles.undoButton, pressed && styles.pressed]}>
                <Text style={styles.undoButtonText}>{t('undo')}</Text>
              </Pressable>
            ) : null}
            <Pressable accessibilityRole="button" onPress={handleSaveRound} style={({ pressed }) => [styles.primaryButton, { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primaryShadow }, pressed && styles.pressed]}>
              <Text style={styles.primaryButtonText}>{t('saveRound')}</Text>
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Scoreboard</Text>
      </View>

      {isTeamMatch ? (
        <View style={styles.teamScoreTable}>
          {teamScoreRows.map((team) => (
            <View key={team.teamName} style={[styles.teamScoreRow, team.isLeader && styles.teamScoreLeaderRow]}>
              <View style={[styles.teamScoreHeader, team.isLeader && styles.teamScoreLeaderHeader]}>
                <View style={styles.teamScoreHeaderText}>
                  <Text style={styles.teamScoreName}>{team.teamName}</Text>
                  <Text style={styles.teamScoreMeta}>
                    {team.players.length} players{team.isLeader ? ' - Leader' : ''}
                  </Text>
                </View>
                <Text style={styles.teamScoreTotal}>{team.total}</Text>
              </View>
              <View style={styles.teamScoreSlots}>
                {team.players.map((standing) => (
                  <View key={standing.player.id} style={[styles.teamScorePlayerCell, standing.isOut && styles.teamScorePlayerCellOut]}>
                    <Text style={[styles.teamScorePlayerName, standing.isOut && styles.teamScorePlayerNameOut]} numberOfLines={1}>
                      {standing.player.name}
                    </Text>
                    <Text style={[styles.teamScorePlayerTotal, standing.isOut && styles.teamScorePlayerNameOut]}>{standing.total}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.standingsList}>
          {standings.map((standing) => (
            <View key={standing.player.id} style={styles.playerCard}>
              <View style={styles.playerInfo}>
                <Text style={styles.playerName}>{standing.player.name}</Text>
                {standing.player.teamName ? <Text style={styles.playerTeamName}>{standing.player.teamName}</Text> : null}
                <View style={[styles.statusChip, standing.isWinner ? styles.winnerChip : standing.isOut ? styles.outChip : standing.isLeader ? styles.leaderChip : styles.activeChip]}>
                  <Text style={[styles.statusText, standing.isWinner ? styles.winnerText : standing.isOut ? styles.outText : standing.isLeader ? styles.leaderText : styles.activeText]}>
                    {standing.isWinner ? 'Winner' : standing.isOut ? 'Out' : standing.isLeader ? 'Leader' : 'Active'}
                  </Text>
                </View>
              </View>
              <Text style={styles.totalScore}>{standing.total}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Round history</Text>
      </View>

      {match.rounds.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No rounds yet</Text>
          <Text style={styles.emptyText}>Add the first round to start tracking totals.</Text>
        </View>
      ) : (
        <View style={styles.roundList}>
          {[...match.rounds].reverse().map((round, reverseIndex) => {
            const roundNumber = match.rounds.length - reverseIndex;

            const roundContent = (
              <View style={styles.roundCard}>
                <View style={styles.roundHeader}>
                  <Text style={styles.roundTitle}>Round {roundNumber}</Text>
                  {isCompleted ? <Text style={styles.roundHint}>Locked</Text> : null}
                </View>
                <Text numberOfLines={2} style={styles.roundScores}>{formatRoundScore(match, round)}</Text>
                <Text numberOfLines={1} style={styles.roundScanSummary}>{getRoundScanSummary(match, round)}</Text>
                {!isCompleted ? (
                  <View style={styles.roundInlineActions}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() =>
                        router.push(
                          `/matches/edit-round?matchId=${encodeURIComponent(matchId)}&roundId=${encodeURIComponent(round.id)}` as Href,
                        )
                      }
                      style={({ pressed }) => [styles.roundInlineEditButton, pressed && styles.pressed]}>
                      <Text style={styles.roundInlineEditText}>{t('edit')}</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => handleDeleteRound(round.id)}
                      style={({ pressed }) => [styles.roundInlineDeleteButton, pressed && styles.pressed]}>
                      <Text style={styles.roundInlineDeleteText}>{t('delete')}</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );

            if (isCompleted) {
              return <View key={round.id}>{roundContent}</View>;
            }

            return (
              <Swipeable
                key={round.id}
                overshootRight={false}
                renderRightActions={() => (
                  <View style={styles.roundSwipeActions}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() =>
                        router.push(
                          `/matches/edit-round?matchId=${encodeURIComponent(matchId)}&roundId=${encodeURIComponent(round.id)}` as Href,
                        )
                      }
                      style={({ pressed }) => [styles.roundSwipeEditAction, pressed && styles.pressed]}>
                      <Text style={styles.roundSwipeActionText}>{t('edit')}</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => handleDeleteRound(round.id)}
                      style={({ pressed }) => [styles.roundSwipeDeleteAction, pressed && styles.pressed]}>
                      <Text style={styles.roundSwipeActionText}>{t('delete')}</Text>
                    </Pressable>
                  </View>
                )}>
                {roundContent}
              </Swipeable>
            );
          })}
        </View>
      )}

      </ScrollView>
      <Modal animationType="slide" onRequestClose={() => setIsSummaryVisible(false)} transparent visible={isSummaryVisible}>
        <View style={styles.summaryOverlay}>
          <View style={[styles.summarySheet, { backgroundColor: theme.colors.screen }]}>
            <ScrollView contentContainerStyle={styles.summaryContent} keyboardShouldPersistTaps="handled">
              <View style={[styles.summaryHero, { backgroundColor: theme.colors.hero }]}>
                <Text style={[styles.summaryKicker, { color: theme.colors.accent }]}>{matchInsights.status} summary</Text>
                <Text style={styles.summaryTitle}>{match.name}</Text>
                <Text style={styles.summarySubtitle}>
                  {matchInsights.gamePresetLabel ? `${matchInsights.gamePresetLabel} - ` : ''}{matchInsights.ruleSummary}
                </Text>
              </View>

              <View style={styles.summaryMetricGrid}>
                <View style={styles.summaryMetricCard}>
                  <Text style={styles.summaryMetricValue}>{matchInsights.roundsPlayed}</Text>
                  <Text style={styles.summaryMetricLabel}>rounds</Text>
                </View>
                <View style={styles.summaryMetricCard}>
                  <Text style={styles.summaryMetricValue}>{match.players.length}</Text>
                  <Text style={styles.summaryMetricLabel}>players</Text>
                </View>
                <View style={styles.summaryMetricCard}>
                  <Text style={styles.summaryMetricValue}>{matchInsights.outPlayers.length}</Text>
                  <Text style={styles.summaryMetricLabel}>out</Text>
                </View>
              </View>

              <View style={styles.summaryCard}>
                <Text style={styles.summarySectionLabel}>{matchInsights.leaderLabel}</Text>
                <Text style={styles.summaryLeaderName}>{matchInsights.leader ? matchInsights.leader.player.name : 'No leader yet'}</Text>
                <Text style={styles.summaryLeaderMeta}>
                  {matchInsights.leader ? `Total ${matchInsights.leader.total}` : 'Add rounds to see the leader.'}
                </Text>
              </View>

              {matchInsights.teamStandings.length > 1 ? (
                <View style={styles.summaryCard}>
                  <Text style={styles.summarySectionLabel}>Team totals</Text>
                  <View style={styles.summaryList}>
                    {matchInsights.teamStandings.map((team) => (
                      <View key={team.teamName} style={styles.summaryListRow}>
                        <Text style={styles.summaryListName}>{team.teamName}</Text>
                        <Text style={styles.summaryListValue}>
                          {team.total}{team.isLeader ? ' leader' : ''}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              <View style={styles.summaryCard}>
                <Text style={styles.summarySectionLabel}>Round bests</Text>
                <View style={styles.summaryList}>
                  {sortedRoundBestCounts.map((roundBest) => (
                    <View key={roundBest.playerName} style={styles.summaryListRow}>
                      <Text style={styles.summaryListName}>{roundBest.playerName}</Text>
                      <Text style={styles.summaryListValue}>{roundBest.count}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.summaryCard}>
                <Text style={styles.summarySectionLabel}>{matchInsights.bestSingleRoundLabel} single round</Text>
                {matchInsights.bestSingleRound ? (
                  <>
                    <Text style={styles.summaryLeaderName}>{matchInsights.bestSingleRound.playerName}</Text>
                    <Text style={styles.summaryLeaderMeta}>
                      Scored {matchInsights.bestSingleRound.score} in round {matchInsights.bestSingleRound.roundNumber}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.summaryLeaderMeta}>No rounds yet.</Text>
                )}
              </View>

              {matchInsights.outPlayers.length > 0 ? (
                <View style={styles.summaryCard}>
                  <Text style={styles.summarySectionLabel}>Out players</Text>
                  <Text style={styles.summaryLeaderMeta}>{matchInsights.outPlayers.join(', ')}</Text>
                </View>
              ) : null}

              <View style={styles.summaryActionGrid}>
                <Pressable accessibilityRole="button" onPress={() => setIsSummaryVisible(false)} style={({ pressed }) => [styles.summarySecondaryAction, pressed && styles.pressed]}>
                  <Text style={styles.summarySecondaryActionText}>Keep Playing</Text>
                </Pressable>
                {!isCompleted ? (
                  <Pressable accessibilityRole="button" onPress={() => void handleCompleteMatch()} style={({ pressed }) => [styles.summaryPrimaryAction, { backgroundColor: theme.colors.primary }, pressed && styles.pressed]}>
                    <Text style={styles.summaryPrimaryActionText}>Complete Match</Text>
                  </Pressable>
                ) : null}
                <Pressable accessibilityRole="button" onPress={() => void handleShareSummary()} style={({ pressed }) => [styles.summarySecondaryAction, pressed && styles.pressed]}>
                  <Text style={styles.summarySecondaryActionText}>{t('share')}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setIsSummaryVisible(false);
                    router.replace('/' as Href);
                  }}
                  style={({ pressed }) => [styles.summarySecondaryAction, pressed && styles.pressed]}>
                  <Text style={styles.summarySecondaryActionText}>Back Home</Text>
                </Pressable>
              </View>
            </ScrollView>
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
    gap: 12,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 26,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F6F8',
    padding: 20,
  },
  summaryOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  summarySheet: {
    maxHeight: '92%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: '#EEF2F6',
    overflow: 'hidden',
  },
  summaryContent: {
    gap: 14,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 28,
  },
  summaryHero: {
    gap: 6,
    borderRadius: 8,
    backgroundColor: '#172033',
    padding: 18,
  },
  summaryKicker: {
    color: '#66E3D2',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  summaryTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34,
  },
  summarySubtitle: {
    color: '#CBD5E1',
    fontSize: 15,
    lineHeight: 21,
  },
  summaryMetricGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryMetricCard: {
    flex: 1,
    minHeight: 76,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    padding: 14,
  },
  summaryMetricValue: {
    color: '#111827',
    fontSize: 25,
    fontWeight: '900',
    lineHeight: 30,
  },
  summaryMetricLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  summaryCard: {
    gap: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  summarySectionLabel: {
    color: '#14B8A6',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  summaryLeaderName: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30,
  },
  summaryLeaderMeta: {
    color: '#64748B',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
  },
  summaryList: {
    gap: 8,
  },
  summaryListRow: {
    minHeight: 42,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 12,
  },
  summaryListName: {
    flex: 1,
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
  },
  summaryListValue: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '900',
  },
  summaryActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryPrimaryAction: {
    flex: 1,
    minWidth: 160,
    minHeight: 52,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F97316',
  },
  summaryPrimaryActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  summarySecondaryAction: {
    flex: 1,
    minWidth: 120,
    minHeight: 52,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summarySecondaryActionText: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '900',
  },
  heroCard: {
    gap: 5,
    borderRadius: 8,
    backgroundColor: '#172033',
    padding: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  heroTitleBlock: {
    flex: 1,
    gap: 3,
  },
  kicker: {
    color: '#66E3D2',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 24,
  },
  pillStack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  livePill: {
    backgroundColor: '#D9F9F3',
  },
  completedPill: {
    backgroundColor: '#FEF3C7',
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '900',
  },
  livePillText: {
    color: '#0F766E',
  },
  completedPillText: {
    color: '#92400E',
  },
  roundPill: {
    borderRadius: 999,
    backgroundColor: '#29354A',
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  roundPillText: {
    color: '#DDE6F3',
    fontSize: 9,
    fontWeight: '800',
  },
  limitPanel: {
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  limitTextBlock: {
    flex: 1,
    gap: 2,
  },
  limitLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  limitValue: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 18,
  },
  limitRuleText: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 16,
  },
  limitInput: {
    maxWidth: 110,
    minHeight: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    color: '#111827',
    fontSize: 17,
    fontWeight: '900',
    paddingHorizontal: 10,
  },
  limitActions: {
    flexDirection: 'row',
    gap: 6,
  },
  editLimitButton: {
    borderRadius: 8,
    backgroundColor: '#FFE8D7',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  editLimitButtonText: {
    color: '#C2410C',
    fontSize: 11,
    fontWeight: '900',
  },
  secondaryButton: {
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  secondaryButtonText: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '900',
  },
  saveLimitButton: {
    borderRadius: 8,
    backgroundColor: '#F97316',
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  saveLimitButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  summaryButton: {
    flex: 1,
    minWidth: 58,
    minHeight: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#14B8A6',
  },
  summaryButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  playAgainButton: {
    flex: 1,
    minWidth: 58,
    minHeight: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F97316',
  },
  playAgainButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  reopenButton: {
    flex: 1,
    minWidth: 64,
    minHeight: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DBEAFE',
  },
  reopenButtonText: {
    color: '#1D4ED8',
    fontSize: 10,
    fontWeight: '900',
  },
  shareButton: {
    flex: 1,
    minWidth: 56,
    minHeight: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0F2FE',
  },
  shareButtonText: {
    color: '#0369A1',
    fontSize: 10,
    fontWeight: '900',
  },
  settingsButton: {
    flex: 1,
    minWidth: 64,
    minHeight: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  settingsButtonText: {
    color: '#334155',
    fontSize: 10,
    fontWeight: '900',
  },
  ruleSummaryPill: {
    alignSelf: 'center',
    borderRadius: 999,
    backgroundColor: '#29354A',
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  ruleSummaryPillText: {
    color: '#DDE6F3',
    fontSize: 10,
    fontWeight: '900',
  },
  winnerBanner: {
    borderRadius: 8,
    backgroundColor: '#DDFBEF',
    padding: 18,
    borderWidth: 1,
    borderColor: '#9DE8C8',
  },
  winnerBannerLabel: {
    color: '#047857',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  winnerBannerName: {
    color: '#065F46',
    fontSize: 26,
    fontWeight: '900',
  },
  completedBanner: {
    gap: 5,
    borderRadius: 8,
    backgroundColor: '#FFF7ED',
    padding: 18,
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  completedBannerLabel: {
    color: '#C2410C',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  completedBannerTitle: {
    color: '#9A3412',
    fontSize: 24,
    fontWeight: '900',
  },
  completedBannerText: {
    color: '#C2410C',
    fontSize: 15,
    lineHeight: 22,
  },
  entryCard: {
    gap: 9,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8F3EA',
    padding: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  entryHeader: {
    gap: 3,
  },
  entryTitle: {
    color: '#111827',
    fontSize: 19,
    fontWeight: '900',
  },
  entryHint: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 17,
  },
  draftSavedText: {
    color: '#0F766E',
    fontSize: 11,
    fontWeight: '900',
  },
  teamEntryList: {
    gap: 8,
  },
  teamEntryGroup: {
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  teamEntryLeaderGroup: {
    borderColor: '#14B8A6',
  },
  teamEntryHeader: {
    minHeight: 34,
    backgroundColor: '#111827',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 9,
  },
  teamEntryLeaderHeader: {
    backgroundColor: '#0F766E',
  },
  teamEntryHeaderText: {
    flex: 1,
    gap: 1,
  },
  teamEntryName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  teamEntryMeta: {
    color: '#CBD5E1',
    fontSize: 10,
    fontWeight: '900',
  },
  teamEntryTotal: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  scoreEntryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    padding: 6,
  },
  scoreEntryCard: {
    flexGrow: 1,
    flexBasis: '47%',
    minWidth: 138,
    minHeight: 62,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    padding: 8,
  },
  selectedEntryCard: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
  },
  disabledEntryCard: {
    backgroundColor: '#E8EEF5',
  },
  scoreEntryCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  scoreEntryPlayer: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  scoreEntryName: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '900',
  },
  scoreEntryMeta: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
  },
  disabledText: {
    color: '#94A3B8',
  },
  scoreValueBox: {
    minWidth: 88,
    minHeight: 54,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D8DEE8',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  selectedScoreValueBox: {
    borderColor: '#0284C7',
    backgroundColor: '#FFFFFF',
  },
  disabledScoreValueBox: {
    backgroundColor: '#DCE3EC',
  },
  scoreValueText: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '900',
  },
  selectedScoreValueText: {
    color: '#0369A1',
  },
  scoreInput: {
    width: 72,
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D8DEE8',
    backgroundColor: '#FFFFFF',
    color: '#111827',
    fontSize: 23,
    fontWeight: '900',
    textAlign: 'center',
  },
  selectedScoreInput: {
    borderColor: '#0284C7',
    backgroundColor: '#F0F9FF',
    color: '#0369A1',
  },
  disabledInput: {
    backgroundColor: '#DCE3EC',
    color: '#94A3B8',
  },
  roundActionRow: {
    flexDirection: 'row',
    gap: 7,
  },
  clearDraftButton: {
    flex: 0.9,
    minWidth: 68,
    minHeight: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  clearDraftButtonText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '900',
  },
  nextPlayerButton: {
    flex: 0.75,
    minWidth: 92,
    minHeight: 56,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DBEAFE',
  },
  nextPlayerButtonText: {
    color: '#1D4ED8',
    fontSize: 17,
    fontWeight: '900',
  },
  undoButton: {
    flex: 0.9,
    minWidth: 68,
    minHeight: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  undoButtonText: {
    color: '#C2410C',
    fontSize: 13,
    fontWeight: '900',
  },
  sectionHeader: {
    marginTop: 2,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '900',
  },
  standingsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  teamScoreTable: {
    gap: 7,
  },
  teamScoreRow: {
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  teamScoreLeaderRow: {
    borderColor: '#14B8A6',
  },
  teamScoreHeader: {
    minHeight: 34,
    backgroundColor: '#111827',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 10,
  },
  teamScoreLeaderHeader: {
    backgroundColor: '#0F766E',
  },
  teamScoreHeaderText: {
    flex: 1,
    gap: 1,
  },
  teamScoreName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  teamScoreMeta: {
    color: '#CBD5E1',
    fontSize: 10,
    fontWeight: '900',
  },
  teamScoreTotal: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
  },
  teamScoreSlots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    padding: 7,
  },
  teamScorePlayerCell: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 92,
    minHeight: 36,
    borderRadius: 8,
    backgroundColor: '#E0F2FE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 9,
  },
  teamScorePlayerCellOut: {
    backgroundColor: '#E8EEF5',
  },
  teamScorePlayerName: {
    flex: 1,
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '900',
  },
  teamScorePlayerNameOut: {
    color: '#94A3B8',
  },
  teamScorePlayerTotal: {
    color: '#0369A1',
    fontSize: 16,
    fontWeight: '900',
  },
  teamList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  teamCard: {
    flexGrow: 1,
    flexBasis: '47%',
    minWidth: 150,
    minHeight: 64,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    padding: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 2,
  },
  teamLeaderCard: {
    borderColor: '#14B8A6',
    backgroundColor: '#ECFDF5',
  },
  teamInfo: {
    flex: 1,
    gap: 2,
  },
  teamName: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
  },
  teamMeta: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
  },
  teamTotal: {
    color: '#111827',
    fontSize: 26,
    fontWeight: '900',
  },
  playerCard: {
    flexGrow: 1,
    flexBasis: '47%',
    minWidth: 150,
    minHeight: 62,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    padding: 9,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  playerInfo: {
    flex: 1,
    gap: 4,
  },
  playerName: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '900',
  },
  playerTeamName: {
    alignSelf: 'flex-start',
    color: '#64748B',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  totalScore: {
    color: '#111827',
    fontSize: 23,
    fontWeight: '900',
  },
  statusChip: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  activeChip: {
    backgroundColor: '#D9F9F3',
  },
  leaderChip: {
    backgroundColor: '#DBEAFE',
  },
  outChip: {
    backgroundColor: '#FFE2E2',
  },
  winnerChip: {
    backgroundColor: '#FEF3C7',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '900',
  },
  activeText: {
    color: '#0F766E',
  },
  leaderText: {
    color: '#1D4ED8',
  },
  outText: {
    color: '#B91C1C',
  },
  winnerText: {
    color: '#92400E',
  },
  primaryButton: {
    flex: 1.8,
    minWidth: 80,
    minHeight: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F97316',
    shadowColor: '#C2410C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  emptyCard: {
    gap: 6,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    padding: 14,
  },
  emptyTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 15,
    lineHeight: 22,
  },
  roundList: {
    gap: 7,
  },
  roundCard: {
    gap: 6,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    padding: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  roundHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  roundTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
  },
  roundHint: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  roundInlineActions: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 2,
  },
  roundInlineEditButton: {
    minHeight: 30,
    borderRadius: 8,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  roundInlineEditText: {
    color: '#0369A1',
    fontSize: 12,
    fontWeight: '900',
  },
  roundInlineDeleteButton: {
    minHeight: 30,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  roundInlineDeleteText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '900',
  },
  roundSwipeActions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 8,
  },
  roundSwipeEditAction: {
    width: 78,
    borderRadius: 8,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundSwipeDeleteAction: {
    width: 88,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundSwipeActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  roundActions: {
    flexDirection: 'row',
    gap: 8,
  },
  smallButton: {
    borderRadius: 8,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  smallButtonText: {
    color: '#0369A1',
    fontSize: 14,
    fontWeight: '800',
  },
  deleteButton: {
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  deleteButtonText: {
    color: '#B91C1C',
    fontSize: 14,
    fontWeight: '800',
  },
  roundScores: {
    color: '#475569',
    fontSize: 12,
    lineHeight: 17,
  },
  roundScanSummary: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    color: '#334155',
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pressed: {
    opacity: 0.82,
  },
});
