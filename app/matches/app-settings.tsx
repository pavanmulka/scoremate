import Constants from 'expo-constants';
import { router, type Href } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { clearEntitlementsForTesting } from '@/features/matches/entitlements';
import { clearMatchesForTesting } from '@/features/matches/matchStorage';
import { clearSavedPlayersForTesting } from '@/features/matches/playerStorage';
import { clearSelectedThemeForTesting } from '@/features/matches/themeStorage';
import { useScoreMateTheme } from '@/hooks/use-scoremate-theme';

const settingsRows = [
  {
    title: 'Themes',
    description: 'Choose the color style for this device.',
    href: '/matches/themes' as Href,
  },
  {
    title: 'Player Stats',
    description: 'Review saved players and local match activity.',
    href: '/matches/stats' as Href,
  },
  {
    title: 'Backup / Restore',
    description: 'Export or restore your local ScoreMate data.',
    href: '/matches/backup' as Href,
  },
];

export default function AppSettingsScreen() {
  const theme = useScoreMateTheme();
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  function handleClearLocalData() {
    Alert.alert('Clear local data?', 'This removes saved matches, round drafts, saved players, and the selected theme from this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear data',
        style: 'destructive',
        onPress: async () => {
          await clearMatchesForTesting();
          await clearSavedPlayersForTesting();
          await clearSelectedThemeForTesting();
          await clearEntitlementsForTesting();
          Alert.alert('Local data cleared', 'ScoreMate has been reset on this device.');
          router.replace('/' as Href);
        },
      },
    ]);
  }

  return (
    <ScrollView style={[styles.screen, { backgroundColor: theme.colors.screen }]} contentContainerStyle={styles.container}>
      <View style={[styles.heroCard, { backgroundColor: theme.colors.hero }]}>
        <Text style={[styles.kicker, { color: theme.colors.accent }]}>Settings</Text>
        <Text style={styles.title}>ScoreMate</Text>
        <Text style={styles.subtitle}>Manage local scorekeeping tools on this device.</Text>
      </View>

      <View style={styles.section}>
        {settingsRows.map((row) => (
          <Pressable
            accessibilityRole="button"
            key={row.title}
            onPress={() => router.push(row.href)}
            style={({ pressed }) => [styles.settingsRow, pressed && styles.pressed]}>
            <View style={styles.settingsRowText}>
              <Text style={styles.rowTitle}>{row.title}</Text>
              <Text style={styles.rowDescription}>{row.description}</Text>
            </View>
            <Text style={[styles.rowArrow, { color: theme.colors.primary }]}>Open</Text>
          </Pressable>
        ))}

        <Pressable accessibilityRole="button" onPress={handleClearLocalData} style={({ pressed }) => [styles.settingsRow, pressed && styles.pressed]}>
          <View style={styles.settingsRowText}>
            <Text style={styles.rowTitle}>Clear local data</Text>
            <Text style={styles.rowDescription}>Reset saved matches, players, drafts, and theme on this device.</Text>
          </View>
          <Text style={styles.dangerText}>Clear</Text>
        </Pressable>
      </View>

      <View style={[styles.aboutCard, { backgroundColor: theme.colors.cardTint, borderColor: theme.colors.border }]}>
        <Text style={styles.aboutTitle}>About ScoreMate</Text>
        <Text style={[styles.aboutText, { color: theme.colors.secondaryText }]}>
          ScoreMate is an offline scorekeeper for card games, board games, sports, party games, and custom matches. It keeps scores locally on this device with no account or internet required.
        </Text>
        <Text style={styles.versionText}>Version {appVersion}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  heroCard: {
    gap: 5,
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
    fontSize: 13,
    lineHeight: 19,
  },
  section: {
    gap: 8,
  },
  settingsRow: {
    minHeight: 64,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  settingsRowText: {
    flex: 1,
    gap: 3,
  },
  rowTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
  },
  rowDescription: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  rowArrow: {
    color: '#F97316',
    fontSize: 12,
    fontWeight: '900',
  },
  dangerText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '900',
  },
  aboutCard: {
    gap: 7,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#FFF7ED',
    padding: 12,
  },
  aboutTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '900',
  },
  aboutText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  versionText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.82,
  },
});
