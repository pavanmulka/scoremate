import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

const defaultOutLimit = '300';

export default function CreateMatchScreen() {
  const [matchName, setMatchName] = useState('');
  const [outLimit, setOutLimit] = useState(defaultOutLimit);

  function handleNext() {
    const trimmedName = matchName.trim();
    const parsedOutLimit = Number(outLimit);

    if (!trimmedName) {
      Alert.alert('Match name required', 'Enter a name for this match.');
      return;
    }

    if (!Number.isFinite(parsedOutLimit) || parsedOutLimit <= 0) {
      Alert.alert('Invalid out limit', 'Out limit must be a number greater than 0.');
      return;
    }

    router.push(
      `/games/least-count/add-players?matchName=${encodeURIComponent(trimmedName)}&outLimit=${Math.floor(parsedOutLimit)}` as Href,
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.title}>Create match</Text>
        <Text style={styles.subtitle}>Set up the match details before adding players.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Match name</Text>
        <TextInput
          autoCapitalize="words"
          onChangeText={setMatchName}
          placeholder="Friday cards"
          placeholderTextColor="#94A3B8"
          style={styles.input}
          value={matchName}
        />

        <Text style={styles.label}>Out limit</Text>
        <TextInput
          keyboardType="number-pad"
          onChangeText={setOutLimit}
          placeholder={defaultOutLimit}
          placeholderTextColor="#94A3B8"
          style={styles.input}
          value={outLimit}
        />
      </View>

      <Pressable accessibilityRole="button" onPress={handleNext} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
        <Text style={styles.primaryButtonText}>Next</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    gap: 22,
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
    marginTop: 8,
  },
  input: {
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
