import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { addRound, getMatch } from '@/features/games/least-count/matchStorage';
import { getPlayerStandings } from '@/features/games/least-count/scoreCalculator';
import type { Match, PlayerScore, Round } from '@/features/games/least-count/types';

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseScore(value: string) {
  if (value.trim() === '') {
    return 0;
  }

  const score = Number(value);
  return Number.isFinite(score) && score >= 0 ? score : null;
}

export default function AddRoundScreen() {
  const { matchId } = useLocalSearchParams<{ matchId?: string }>();
  const [match, setMatch] = useState<Match | null>(null);
  const [scoresByPlayer, setScoresByPlayer] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!matchId) {
      return;
    }

    getMatch(matchId).then((storedMatch) => {
      setMatch(storedMatch);
    });
  }, [matchId]);

  async function handleSaveRound() {
    if (!match || !matchId) {
      return;
    }

    const standings = getPlayerStandings(match);
    const roundScores: PlayerScore[] = [];

    for (const standing of standings) {
      if (standing.isOut) {
        continue;
      }

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

    await addRound(matchId, round);
    router.back();
  }

  if (!match) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>Match not found</Text>
      </View>
    );
  }

  const standings = getPlayerStandings(match);

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.title}>Add round</Text>
        <Text style={styles.subtitle}>{match.name}</Text>
      </View>

      <View style={styles.scoreList}>
        {standings.map((standing) => (
          <View key={standing.player.id} style={[styles.scoreCard, standing.isOut && styles.disabledCard]}>
            <View style={styles.playerInfo}>
              <Text style={[styles.playerName, standing.isOut && styles.disabledText]}>{standing.player.name}</Text>
              <Text style={[styles.playerMeta, standing.isOut && styles.disabledText]}>
                {standing.isOut ? 'Out - disabled' : `Current total ${standing.total}`}
              </Text>
            </View>
            <TextInput
              editable={!standing.isOut}
              keyboardType="number-pad"
              onChangeText={(value) =>
                setScoresByPlayer((currentScores) => ({
                  ...currentScores,
                  [standing.player.id]: value,
                }))
              }
              placeholder="0"
              placeholderTextColor="#94A3B8"
              style={[styles.scoreInput, standing.isOut && styles.disabledInput]}
              value={scoresByPlayer[standing.player.id] ?? ''}
            />
          </View>
        ))}
      </View>

      <Pressable accessibilityRole="button" onPress={handleSaveRound} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
        <Text style={styles.primaryButtonText}>Save Round</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
  },
  subtitle: {
    color: '#64748B',
    fontSize: 16,
    lineHeight: 23,
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
  disabledCard: {
    backgroundColor: '#E9EEF4',
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
  disabledText: {
    color: '#94A3B8',
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
  disabledInput: {
    backgroundColor: '#DCE3EC',
    color: '#94A3B8',
  },
  primaryButton: {
    minHeight: 56,
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
