import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { clearEntitlementsForTesting } from '@/features/matches/entitlements';
import { clearMatchesForTesting } from '@/features/matches/matchStorage';
import { clearSavedPlayersForTesting } from '@/features/matches/playerStorage';
import { clearSelectedThemeForTesting } from '@/features/matches/themeStorage';
import { clearWelcomeForTesting } from '@/features/matches/welcomeStorage';
import { useScoreMateTheme } from '@/hooks/use-scoremate-theme';

const settingsRows = [
  {
    title: 'Themes',
    description: 'Choose the app color style.',
    icon: 'color-palette-outline',
    href: '/matches/themes' as Href,
  },
  {
    title: 'Player Stats',
    description: 'Review saved players and match activity.',
    icon: 'stats-chart-outline',
    href: '/matches/stats' as Href,
  },
  {
    title: 'Backup / Restore',
    description: 'Export or restore local data.',
    icon: 'cloud-upload-outline',
    href: '/matches/backup' as Href,
  },
] satisfies {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: Href;
}[];

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
          await clearWelcomeForTesting();
          Alert.alert('Local data cleared', 'ScoreMate has been reset on this device.');
          router.replace('/' as Href);
        },
      },
    ]);
  }

  return (
    <ScrollView style={[styles.screen, { backgroundColor: theme.colors.screen }]} contentContainerStyle={styles.container}>
      <View style={[styles.heroCard, { backgroundColor: theme.colors.hero }]}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Manage ScoreMate on this device.</Text>
      </View>

      <View style={styles.section}>
        {settingsRows.map((row) => (
          <Pressable
            accessibilityRole="button"
            key={row.title}
            onPress={() => router.push(row.href)}
            style={({ pressed }) => [styles.settingsRow, pressed && styles.pressed]}>
            <View style={[styles.rowIcon, { backgroundColor: theme.colors.cardTint }]}>
              <Ionicons name={row.icon} size={18} color={theme.colors.primaryShadow} />
            </View>
            <View style={styles.settingsRowText}>
              <Text style={styles.rowTitle}>{row.title}</Text>
              <Text style={styles.rowDescription}>{row.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </Pressable>
        ))}

        <Pressable accessibilityRole="button" onPress={handleClearLocalData} style={({ pressed }) => [styles.settingsRow, styles.dangerRow, pressed && styles.pressed]}>
          <View style={styles.dangerIcon}>
            <Ionicons name="trash-outline" size={18} color="#B91C1C" />
          </View>
          <View style={styles.settingsRowText}>
            <Text style={styles.rowTitle}>Clear local data</Text>
            <Text style={styles.rowDescription}>Remove matches, players, drafts, and theme.</Text>
          </View>
          <Text style={styles.dangerText}>Clear</Text>
        </Pressable>
      </View>

      <View style={styles.aboutCard}>
        <View style={styles.aboutHeader}>
          <View style={[styles.rowIcon, { backgroundColor: theme.colors.cardTint }]}>
            <Ionicons name="information-circle-outline" size={18} color={theme.colors.primaryShadow} />
          </View>
          <View style={styles.settingsRowText}>
            <Text style={styles.aboutTitle}>About ScoreMate</Text>
            <Text style={styles.versionText}>Version {appVersion}</Text>
          </View>
        </View>
        <Text style={styles.aboutText}>Offline scorekeeping. No login. Your data stays on this device.</Text>
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
  section: {
    gap: 7,
  },
  settingsRow: {
    minHeight: 58,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    padding: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
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
  dangerRow: {
    borderWidth: 1,
    borderColor: '#FECACA',
    shadowOpacity: 0.03,
  },
  dangerIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
  },
  dangerText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '900',
  },
  aboutCard: {
    gap: 8,
    borderRadius: 8,
    borderColor: '#E2E8F0',
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  aboutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  aboutTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
  },
  aboutText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
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
