import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { saveMatch } from '@/features/games/least-count/matchStorage';
import type { Match, Player } from '@/features/games/least-count/types';

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function AddPlayersScreen() {
  const params = useLocalSearchParams<{ matchName?: string; outLimit?: string }>();
  const matchName = params.matchName?.trim() || 'Least Count Match';
  const outLimit = Number(params.outLimit) || 300;

  const [playerName, setPlayerName] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);

  const normalizedNames = useMemo(() => players.map((player) => player.name.trim().toLowerCase()), [players]);

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

    setPlayers((currentPlayers) => [...currentPlayers, { id: createId('player'), name: trimmedName }]);
    setPlayerName('');
  }

  async function handleStartMatch() {
    if (players.length < 2) {
      Alert.alert('Add at least 2 players', 'Least Count needs at least 2 players to start.');
      return;
    }

    const now = new Date().toISOString();
    const match: Match = {
      id: createId('match'),
      name: matchName,
      outLimit,
      players,
      rounds: [],
      createdAt: now,
      updatedAt: now,
    };

    const savedMatch = await saveMatch(match);
    router.replace(`/games/least-count/scoreboard?matchId=${encodeURIComponent(savedMatch.id)}` as Href);
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.title}>Add players</Text>
        <Text style={styles.subtitle}>{matchName} - Out limit {outLimit}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Player name</Text>
        <View style={styles.addRow}>
          <TextInput
            autoCapitalize="words"
            onChangeText={setPlayerName}
            onSubmitEditing={handleAddPlayer}
            placeholder="Player name"
            placeholderTextColor="#94A3B8"
            returnKeyType="done"
            style={styles.input}
            value={playerName}
          />
          <Pressable accessibilityRole="button" onPress={handleAddPlayer} style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.playersList}>
        {players.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No players added</Text>
            <Text style={styles.emptyText}>Add at least two players to start the match.</Text>
          </View>
        ) : (
          players.map((player, index) => (
            <View key={player.id} style={styles.playerRow}>
              <View>
                <Text style={styles.playerName}>{player.name}</Text>
                <Text style={styles.playerMeta}>Player {index + 1}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => setPlayers((currentPlayers) => currentPlayers.filter((storedPlayer) => storedPlayer.id !== player.id))}
                style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}>
                <Text style={styles.deleteButtonText}>Delete</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>

      <Pressable accessibilityRole="button" onPress={handleStartMatch} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
        <Text style={styles.primaryButtonText}>Start Match</Text>
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
  card: {
    gap: 10,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 18,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 2,
  },
  label: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '800',
  },
  addRow: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D8DEE8',
    backgroundColor: '#F8FAFC',
    color: '#111827',
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 16,
  },
  addButton: {
    minWidth: 72,
    minHeight: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  playersList: {
    gap: 10,
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
  playerRow: {
    minHeight: 76,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 2,
  },
  playerName: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
  },
  playerMeta: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
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
});
