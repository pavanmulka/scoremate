import { useFocusEffect, router, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getMatches } from '@/features/games/least-count/matchStorage';
import { getPlayerStandings } from '@/features/games/least-count/scoreCalculator';
import type { Match } from '@/features/games/least-count/types';

export default function GameHomeScreen() {
  const [matches, setMatches] = useState<Match[]>([]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      getMatches().then((storedMatches) => {
        if (isActive) {
          setMatches(storedMatches);
        }
      });

      return () => {
        isActive = false;
      };
    }, []),
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.kicker}>ScoreMate game</Text>
        <Text style={styles.title}>Least Count</Text>
        <Text style={styles.subtitle}>Offline score tracker</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/games/least-count/create-match' as Href)}
        style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
        <Text style={styles.primaryButtonText}>Create Match</Text>
      </Pressable>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent matches</Text>
      </View>

      {matches.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No matches yet</Text>
          <Text style={styles.emptyText}>Create a match, add players, and keep score offline on this phone.</Text>
        </View>
      ) : (
        <View style={styles.matchList}>
          {matches.map((match) => {
            const standings = getPlayerStandings(match);
            const winner = standings.find((standing) => standing.isWinner);

            return (
              <Pressable
                accessibilityRole="button"
                key={match.id}
                onPress={() => router.push(`/games/least-count/scoreboard?matchId=${encodeURIComponent(match.id)}` as Href)}
                style={({ pressed }) => [styles.matchCard, pressed && styles.pressed]}>
                <View style={styles.matchCardTop}>
                  <Text style={styles.matchName}>{match.name}</Text>
                  <Text style={styles.matchMeta}>{match.players.length} players</Text>
                </View>
                <Text style={styles.matchDetail}>Out limit {match.outLimit} - {match.rounds.length} rounds</Text>
                {winner ? <Text style={styles.winnerLine}>Winner: {winner.player.name}</Text> : null}
              </Pressable>
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
    gap: 22,
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 32,
    backgroundColor: '#F4F6F8',
  },
  header: {
    gap: 6,
  },
  kicker: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  title: {
    color: '#111827',
    fontSize: 36,
    fontWeight: '800',
    lineHeight: 42,
  },
  subtitle: {
    color: '#64748B',
    fontSize: 17,
    lineHeight: 24,
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
  pressed: {
    opacity: 0.82,
  },
  sectionHeader: {
    marginTop: 4,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '800',
  },
  emptyCard: {
    gap: 8,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 2,
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
  matchList: {
    gap: 12,
  },
  matchCard: {
    gap: 8,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 18,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 2,
  },
  matchCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  matchName: {
    flex: 1,
    color: '#111827',
    fontSize: 19,
    fontWeight: '800',
  },
  matchMeta: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
  },
  matchDetail: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
  },
  winnerLine: {
    color: '#059669',
    fontSize: 14,
    fontWeight: '800',
  },
});
