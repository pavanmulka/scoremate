import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { getMatch, updateRound } from '@/features/matches/matchStorage';
import { applyScoreSign, normalizeScoreInput, parseScoreInput } from '@/features/matches/scoreInput';
import { useKeyboardBottomInset } from '@/hooks/use-keyboard-bottom-inset';
import type { Match, PlayerScore, Round } from '@/features/matches/types';

export default function EditRoundScreen() {
  const keyboardBottomInset = useKeyboardBottomInset();
  const scoreSignTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { matchId, roundId } = useLocalSearchParams<{ matchId?: string; roundId?: string }>();
  const [match, setMatch] = useState<Match | null>(null);
  const [round, setRound] = useState<Round | null>(null);
  const [scoresByPlayer, setScoresByPlayer] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!matchId || !roundId) {
      return;
    }

    getMatch(matchId).then((storedMatch) => {
      const storedRound = storedMatch?.rounds.find((matchRound) => matchRound.id === roundId) ?? null;
      setMatch(storedMatch);
      setRound(storedRound);

      if (storedRound) {
        setScoresByPlayer(
          Object.fromEntries(storedRound.scores.map((score) => [score.playerId, String(score.score)])),
        );
      }
    });
  }, [matchId, roundId]);

  const roundPlayers = useMemo(() => {
    if (!match || !round) {
      return [];
    }

    return match.players.filter((player) => round.scores.some((score) => score.playerId === player.id));
  }, [match, round]);

  async function handleSaveChanges() {
    if (!matchId || !round) {
      return;
    }

    const updatedScores: PlayerScore[] = [];

    for (const player of roundPlayers) {
      const parsedScore = parseScoreInput(scoresByPlayer[player.id] ?? '');

      if (parsedScore === null) {
        Alert.alert('Invalid score', `${player.name}'s score must be a valid number.`);
        return;
      }

      updatedScores.push({
        playerId: player.id,
        score: parsedScore,
      });
    }

    await updateRound(matchId, {
      ...round,
      scores: updatedScores,
    });
    router.back();
  }

  function markScoreNegative(playerId: string) {
    clearScoreSignPress();
    setScoresByPlayer((currentScores) => ({
      ...currentScores,
      [playerId]: applyScoreSign(currentScores[playerId] ?? '', 'negative'),
    }));
  }

  function clearScoreSignPress() {
    if (scoreSignTimerRef.current) {
      clearTimeout(scoreSignTimerRef.current);
      scoreSignTimerRef.current = null;
    }
  }

  function startScoreSignPress(playerId: string) {
    clearScoreSignPress();
    scoreSignTimerRef.current = setTimeout(() => {
      scoreSignTimerRef.current = null;
      markScoreNegative(playerId);
    }, 520);
  }

  useEffect(() => {
    return () => {
      if (scoreSignTimerRef.current) {
        clearTimeout(scoreSignTimerRef.current);
      }
    };
  }, []);

  if (!match || !round) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>Round not found</Text>
      </View>
    );
  }

  return (
    <View
      style={styles.keyboardView}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.container, keyboardBottomInset > 0 && { paddingBottom: keyboardBottomInset + 20 }]}
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.title}>Edit round</Text>
        <Text style={styles.subtitle}>{match.name}</Text>
        <Text style={styles.helperTip}>Tip: Hold a score to enter a negative value.</Text>
      </View>

      <View style={styles.scoreList}>
        {roundPlayers.map((player) => (
          <Pressable
            accessibilityHint="Long press to enter this score as a negative value."
            accessibilityRole="button"
            delayLongPress={520}
            key={player.id}
            onLongPress={() => markScoreNegative(player.id)}
            style={({ pressed }) => [styles.scoreCard, pressed && styles.pressed]}>
            <View style={styles.playerInfo}>
              <Text style={styles.playerName}>{player.name}</Text>
              <Text style={styles.playerMeta}>Round score</Text>
            </View>
            <TextInput
              contextMenuHidden
              keyboardType="number-pad"
              onChangeText={(value) =>
                setScoresByPlayer((currentScores) => ({
                  ...currentScores,
                  [player.id]: normalizeScoreInput(value, currentScores[player.id] ?? ''),
                }))
              }
              onPressIn={() => startScoreSignPress(player.id)}
              onPressOut={clearScoreSignPress}
              placeholder="0"
              placeholderTextColor="#94A3B8"
              style={styles.scoreInput}
              value={scoresByPlayer[player.id] ?? ''}
            />
          </Pressable>
        ))}
      </View>

      <Pressable accessibilityRole="button" onPress={handleSaveChanges} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
        <Text style={styles.primaryButtonText}>Save Changes</Text>
      </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: '#F4F6F8',
  },
  screen: {
    backgroundColor: '#F4F6F8',
  },
  container: {
    flexGrow: 1,
    gap: 18,
    padding: 20,
    backgroundColor: '#F4F6F8',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F6F8',
    padding: 20,
  },
  header: {
    gap: 6,
  },
  title: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 29,
  },
  subtitle: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
  },
  helperTip: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  scoreList: {
    gap: 12,
  },
  scoreCard: {
    minHeight: 92,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 2,
  },
  playerInfo: {
    flex: 1,
    gap: 5,
  },
  playerName: {
    color: '#111827',
    fontSize: 19,
    fontWeight: '800',
  },
  playerMeta: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '700',
  },
  scoreInput: {
    width: 96,
    minHeight: 58,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D8DEE8',
    backgroundColor: '#F8FAFC',
    color: '#111827',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  primaryButton: {
    minHeight: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
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
