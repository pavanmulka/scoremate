import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';

import { createScoreMateBackup, parseScoreMateBackup, restoreScoreMateBackup, stringifyBackup } from '@/features/matches/dataBackup';
import { useScoreMateTheme } from '@/hooks/use-scoremate-theme';
import { useI18n } from '@/src/i18n';

export default function BackupScreen() {
  const theme = useScoreMateTheme();
  const { t } = useI18n();
  const [backupText, setBackupText] = useState('');
  const [isWorking, setIsWorking] = useState(false);
  const hasBackupText = backupText.trim().length > 0;

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
        { text: t('cancel'), style: 'cancel' },
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
          <Text style={styles.title}>{t('backupRestore')}</Text>
          <Text style={styles.subtitle}>Export or restore local ScoreMate data. No login or cloud sync.</Text>
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
          <Text style={styles.bodyText}>Paste a ScoreMate backup JSON below. Restoring replaces saved matches and players on this device.</Text>
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
            disabled={isWorking || !hasBackupText}
            onPress={handleRestoreBackup}
            style={({ pressed }) => [styles.restoreButton, !hasBackupText && styles.emptyRestoreButton, isWorking && styles.disabledButton, pressed && hasBackupText && styles.pressed]}>
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
  card: {
    gap: 9,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    padding: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '900',
  },
  bodyText: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
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
    minHeight: 132,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    color: '#111827',
    fontSize: 14,
    lineHeight: 20,
    padding: 12,
  },
  restoreButton: {
    minHeight: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DBEAFE',
  },
  restoreButtonText: {
    color: '#1D4ED8',
    fontSize: 15,
    fontWeight: '900',
  },
  emptyRestoreButton: {
    backgroundColor: '#E8EEF5',
    opacity: 0.72,
  },
  disabledButton: {
    opacity: 0.55,
  },
  infoCard: {
    gap: 4,
    borderRadius: 8,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA74',
    padding: 10,
  },
  infoTitle: {
    color: '#9A3412',
    fontSize: 14,
    fontWeight: '900',
  },
  infoText: {
    color: '#C2410C',
    fontSize: 12,
    lineHeight: 17,
  },
  pressed: {
    opacity: 0.82,
  },
});
