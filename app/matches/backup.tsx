import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';

import { createScoreMateBackup, parseScoreMateBackup, restoreScoreMateBackup, stringifyBackup } from '@/features/matches/dataBackup';
import { useScoreMateTheme } from '@/hooks/use-scoremate-theme';

export default function BackupScreen() {
  const theme = useScoreMateTheme();
  const [backupText, setBackupText] = useState('');
  const [isWorking, setIsWorking] = useState(false);

  async function handleExportBackup() {
    setIsWorking(true);

    try {
      const backup = await createScoreMateBackup();
      await Share.share({
        message: stringifyBackup(backup),
        title: 'ScoreMate backup',
      });
    } catch {
      Alert.alert('Export failed', 'Could not create the backup. Try again.');
    } finally {
      setIsWorking(false);
    }
  }

  function handleRestoreBackup() {
    const trimmedBackup = backupText.trim();

    if (!trimmedBackup) {
      Alert.alert('Backup required', 'Paste a ScoreMate backup first.');
      return;
    }

    let backup;

    try {
      backup = parseScoreMateBackup(trimmedBackup);
    } catch (error) {
      Alert.alert('Invalid backup', error instanceof Error ? error.message : 'Backup text could not be read.');
      return;
    }

    Alert.alert(
      'Restore backup?',
      `This will replace local data with ${backup.matches.length} matches and ${backup.savedPlayers.length} saved players from the backup.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          onPress: async () => {
            setIsWorking(true);

            try {
              await restoreScoreMateBackup(backup);
              setBackupText('');
              Alert.alert('Backup restored', 'Your ScoreMate data has been restored on this device.');
            } catch {
              Alert.alert('Restore failed', 'Could not restore this backup. Try again.');
            } finally {
              setIsWorking(false);
            }
          },
        },
      ],
    );
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
          <Text style={[styles.kicker, { color: theme.colors.accent }]}>Local backup</Text>
          <Text style={styles.title}>Backup & Restore</Text>
          <Text style={styles.subtitle}>Export matches and saved players as a plain JSON backup. No account or backend needed.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Export backup</Text>
          <Text style={styles.bodyText}>Share a backup through Notes, Messages, email, or any app on your phone.</Text>
          <Pressable
            accessibilityRole="button"
            disabled={isWorking}
            onPress={handleExportBackup}
            style={({ pressed }) => [styles.primaryButton, { backgroundColor: theme.colors.primary }, isWorking && styles.disabledButton, pressed && styles.pressed]}>
            <Text style={styles.primaryButtonText}>{isWorking ? 'Working...' : 'Export Backup'}</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Restore backup</Text>
          <Text style={styles.bodyText}>Paste a ScoreMate backup JSON below. Restoring replaces saved matches and quick-add players on this device.</Text>
          <TextInput
            multiline
            onChangeText={setBackupText}
            placeholder="Paste backup JSON here"
            placeholderTextColor="#94A3B8"
            style={styles.backupInput}
            textAlignVertical="top"
            value={backupText}
          />
          <Pressable
            accessibilityRole="button"
            disabled={isWorking}
            onPress={handleRestoreBackup}
            style={({ pressed }) => [styles.restoreButton, { backgroundColor: theme.colors.secondary }, isWorking && styles.disabledButton, pressed && styles.pressed]}>
            <Text style={[styles.restoreButtonText, { color: theme.colors.secondaryText }]}>Restore Backup</Text>
          </Pressable>
        </View>

        <View style={[styles.infoCard, { backgroundColor: theme.colors.cardTint, borderColor: theme.colors.border }]}>
          <Text style={styles.infoTitle}>Included in backup</Text>
          <Text style={styles.infoText}>Matches, players, rounds, scoring rules, match status, quick-add saved players, and selected theme.</Text>
        </View>
      </ScrollView>
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
    gap: 18,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 32,
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
    gap: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    padding: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 2,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 21,
    fontWeight: '900',
  },
  bodyText: {
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
  backupInput: {
    minHeight: 180,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    color: '#111827',
    fontSize: 14,
    lineHeight: 20,
    padding: 14,
  },
  restoreButton: {
    minHeight: 54,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DBEAFE',
  },
  restoreButtonText: {
    color: '#1D4ED8',
    fontSize: 16,
    fontWeight: '900',
  },
  disabledButton: {
    opacity: 0.55,
  },
  infoCard: {
    gap: 5,
    borderRadius: 8,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA74',
    padding: 16,
  },
  infoTitle: {
    color: '#9A3412',
    fontSize: 16,
    fontWeight: '900',
  },
  infoText: {
    color: '#C2410C',
    fontSize: 14,
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.82,
  },
});
