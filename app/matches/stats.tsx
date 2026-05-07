import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getMatches } from '@/features/matches/matchStorage';
import { getSavedPlayers } from '@/features/matches/playerStorage';
import { buildPlayerStats, type PlayerStats } from '@/features/matches/playerStats';
import { useScoreMateTheme } from '@/hooks/use-scoremate-theme';

function formatAverage(value: number) {
  return value.toFixed(value % 1 === 0 ? 0 : 1);
}

function formatRoundValue(value: number | null) {
  return value === null ? '-' : String(value);
}

export default function PlayerStatsScreen() {
  const theme = useScoreMateTheme();
  const [stats, setStats] = useState<PlayerStats[]>([]);
  const [matchCount, setMatchCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      Promise.all([getMatches(), getSavedPlayers()]).then(([matches, savedPlayers]) => {
        if (isActive) {
          setStats(buildPlayerStats(matches, savedPlayers));
          setMatchCount(matches.length);
        }
      });

      return () => {
        isActive = false;
      };
    }, []),
  );

  const totalWins = stats.reduce((total, playerStats) => total + playerStats.wins, 0);
  const totalRounds = stats.reduce((total, playerStats) => total + playerStats.roundsPlayed, 0);

  return (
    <ScrollView style={[styles.screen, { backgroundColor: theme.colors.screen }]} contentContainerStyle={styles.container}>
      <View style={[styles.heroCard, { backgroundColor: theme.colors.hero }]}>
        <Text style={styles.title}>Player Stats</Text>
        <Text style={styles.subtitle}>Stats are calculated from matches on this phone.</Text>
      </View>

      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{stats.length}</Text>
          <Text style={styles.summaryLabel}>players</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{matchCount}</Text>
          <Text style={styles.summaryLabel}>matches</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{totalWins}</Text>
          <Text style={styles.summaryLabel}>wins</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{totalRounds}</Text>
          <Text style={styles.summaryLabel}>round entries</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Players</Text>
        <Text style={styles.sectionHint}>Players are grouped by name for now.</Text>
      </View>

      {stats.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No stats yet</Text>
          <Text style={styles.emptyText}>Create a match and save a round to start building player stats.</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/matches/create' as Href)}
            style={({ pressed }) => [styles.primaryButton, { backgroundColor: theme.colors.primary }, pressed && styles.pressed]}>
            <Text style={styles.primaryButtonText}>Create Match</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.statsList}>
          {stats.map((playerStats) => (
            <View key={playerStats.name.toLowerCase()} style={styles.playerCard}>
              <View style={styles.playerHeader}>
                <View style={styles.playerTitleBlock}>
                  <Text style={styles.playerName}>{playerStats.name}</Text>
                  <Text style={styles.playerMeta}>
                    {playerStats.matchesPlayed} matches - {playerStats.roundsPlayed} rounds
                  </Text>
                </View>
                <View style={[styles.winChip, { backgroundColor: theme.colors.cardTint }]}>
                  <Text style={[styles.winChipText, { color: theme.colors.primaryShadow }]}>{playerStats.wins} wins</Text>
                </View>
              </View>

              <View style={styles.metricGrid}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>{formatAverage(playerStats.averageScore)}</Text>
                  <Text style={styles.metricLabel}>avg score</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>{playerStats.totalScore}</Text>
                  <Text style={styles.metricLabel}>total</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>{formatRoundValue(playerStats.bestLowRound)}</Text>
                  <Text style={styles.metricLabel}>best low</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>{formatRoundValue(playerStats.bestHighRound)}</Text>
                  <Text style={styles.metricLabel}>best high</Text>
                </View>
              </View>

              <Text style={styles.savedText}>Quick-add usage: {playerStats.savedUsageCount}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#EEF2F6',
  },
  container: {
    flexGrow: 1,
    gap: 10,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 26,
  },
  heroCard: {
    gap: 3,
    borderRadius: 8,
    backgroundColor: '#172033',
    padding: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 27,
  },
  subtitle: {
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 19,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  summaryCard: {
    flexGrow: 1,
    minWidth: '47%',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    padding: 10,
  },
  summaryValue: {
    color: '#111827',
    fontSize: 21,
    fontWeight: '900',
  },
  summaryLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  sectionHeader: {
    gap: 4,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '900',
  },
  sectionHint: {
    color: '#64748B',
    fontSize: 12,
  },
  emptyCard: {
    gap: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    padding: 18,
  },
  emptyTitle: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '900',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 15,
    lineHeight: 22,
  },
  primaryButton: {
    minHeight: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F97316',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  statsList: {
    gap: 8,
  },
  playerCard: {
    gap: 9,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    padding: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  playerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  playerTitleBlock: {
    flex: 1,
    gap: 4,
  },
  playerName: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '900',
  },
  playerMeta: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
  winChip: {
    borderRadius: 999,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  winChipText: {
    color: '#92400E',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metricCard: {
    flexGrow: 1,
    minWidth: '47%',
    borderRadius: 8,
    backgroundColor: '#F3F7FB',
    padding: 8,
  },
  metricValue: {
    color: '#111827',
    fontSize: 19,
    fontWeight: '900',
  },
  metricLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  savedText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.82,
  },
});
