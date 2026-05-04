import { useFocusEffect, router, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { deleteRound, getMatch } from '@/features/games/least-count/matchStorage';
import { getPlayerStandings } from '@/features/games/least-count/scoreCalculator';
import type { Match, Round } from '@/features/games/least-count/types';

function formatRoundScore(match: Match, round: Round) {
  return match.players
    .map((player) => {
      const score = round.scores.find((playerScore) => playerScore.playerId === player.id)?.score ?? 0;
      return `${player.name}: ${score}`;
    })
    .join('  -  ');
}

export default function ScoreboardScreen() {
  const { matchId } = useLocalSearchParams<{ matchId?: string }>();
  const [match, setMatch] = useState<Match | null>(null);

  const loadMatch = useCallback(() => {
    let isActive = true;

    if (matchId) {
      getMatch(matchId).then((storedMatch) => {
        if (isActive) {
          setMatch(storedMatch);
        }
      });
    }

    return () => {
      isActive = false;
    };
  }, [matchId]);

  useFocusEffect(loadMatch);

  async function handleDeleteRound(roundId: string) {
    if (!matchId) {
      return;
    }

    Alert.alert('Delete round?', 'This will remove the round and recalculate totals.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updatedMatch = await deleteRound(matchId, roundId);
          setMatch(updatedMatch);
        },
      },
    ]);
  }

  if (!match || !matchId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>Match not found</Text>
      </View>
    );
  }

  const standings = getPlayerStandings(match);
  const winner = standings.find((standing) => standing.isWinner);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{match.name}</Text>
        <Text style={styles.subtitle}>Out limit {match.outLimit}</Text>
      </View>

      {winner ? (
        <View style={styles.winnerBanner}>
          <Text style={styles.winnerBannerLabel}>Winner</Text>
          <Text style={styles.winnerBannerName}>{winner.player.name}</Text>
        </View>
      ) : null}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Scoreboard</Text>
      </View>

      <View style={styles.standingsList}>
        {standings.map((standing) => (
          <View key={standing.player.id} style={styles.playerCard}>
            <View style={styles.playerInfo}>
              <Text style={styles.playerName}>{standing.player.name}</Text>
              <View style={[styles.statusChip, standing.isWinner ? styles.winnerChip : standing.isOut ? styles.outChip : styles.activeChip]}>
                <Text style={[styles.statusText, standing.isWinner ? styles.winnerText : standing.isOut ? styles.outText : styles.activeText]}>
                  {standing.isWinner ? 'Winner' : standing.isOut ? 'Out' : 'Active'}
                </Text>
              </View>
            </View>
            <Text style={styles.totalScore}>{standing.total}</Text>
          </View>
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() =>
          router.push(`/games/least-count/add-round?matchId=${encodeURIComponent(matchId)}` as Href)
        }
        style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
        <Text style={styles.primaryButtonText}>Add Round</Text>
      </Pressable>

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

            return (
              <View key={round.id} style={styles.roundCard}>
                <View style={styles.roundHeader}>
                  <Text style={styles.roundTitle}>Round {roundNumber}</Text>
                  <View style={styles.roundActions}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() =>
                        router.push(
                          `/games/least-count/edit-round?matchId=${encodeURIComponent(matchId)}&roundId=${encodeURIComponent(round.id)}` as Href,
                        )
                      }
                      style={({ pressed }) => [styles.smallButton, pressed && styles.pressed]}>
                      <Text style={styles.smallButtonText}>Edit</Text>
                    </Pressable>
                    <Pressable accessibilityRole="button" onPress={() => handleDeleteRound(round.id)} style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}>
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </Pressable>
                  </View>
                </View>
                <Text style={styles.roundScores}>{formatRoundScore(match, round)}</Text>
              </View>
            );
          })}
        </View>
      )}
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
    gap: 4,
  },
  title: {
    color: '#111827',
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
  },
  subtitle: {
    color: '#64748B',
    fontSize: 16,
    lineHeight: 23,
  },
  winnerBanner: {
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
    padding: 18,
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
  sectionHeader: {
    marginTop: 4,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '800',
  },
  standingsList: {
    gap: 10,
  },
  playerCard: {
    minHeight: 86,
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
    gap: 8,
  },
  playerName: {
    color: '#111827',
    fontSize: 19,
    fontWeight: '800',
  },
  totalScore: {
    color: '#111827',
    fontSize: 34,
    fontWeight: '900',
  },
  statusChip: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  activeChip: {
    backgroundColor: '#DBEAFE',
  },
  outChip: {
    backgroundColor: '#FEE2E2',
  },
  winnerChip: {
    backgroundColor: '#DCFCE7',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '900',
  },
  activeText: {
    color: '#1D4ED8',
  },
  outText: {
    color: '#B91C1C',
  },
  winnerText: {
    color: '#047857',
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
  emptyCard: {
    gap: 6,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 18,
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
    gap: 12,
  },
  roundCard: {
    gap: 12,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
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
    fontSize: 18,
    fontWeight: '900',
  },
  roundActions: {
    flexDirection: 'row',
    gap: 8,
  },
  smallButton: {
    borderRadius: 12,
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  smallButtonText: {
    color: '#3730A3',
    fontSize: 14,
    fontWeight: '800',
  },
  deleteButton: {
    borderRadius: 12,
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
    fontSize: 15,
    lineHeight: 22,
  },
  pressed: {
    opacity: 0.82,
  },
});
