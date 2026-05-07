import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { languageNames, setLanguagePreference, supportedLanguageCodes, useI18n, type LanguagePreference } from '@/src/i18n';
import { useScoreMateTheme } from '@/hooks/use-scoremate-theme';

const languageOptions: LanguagePreference[] = ['system', ...supportedLanguageCodes];

export default function LanguageScreen() {
  const theme = useScoreMateTheme();
  const { languageCode, languagePreference, t } = useI18n();

  function getOptionTitle(languagePreferenceOption: LanguagePreference) {
    return languagePreferenceOption === 'system' ? t('languageSystemDefault') : languageNames[languagePreferenceOption];
  }

  function getOptionSubtitle(languagePreferenceOption: LanguagePreference) {
    if (languagePreferenceOption === 'system') {
      return `${t('languageSystemDescription')} ${languageNames[languageCode]}`;
    }

    return languagePreferenceOption;
  }

  return (
    <ScrollView style={[styles.screen, { backgroundColor: theme.colors.screen }]} contentContainerStyle={styles.container}>
      <View style={[styles.heroCard, { backgroundColor: theme.colors.hero }]}>
        <Text style={styles.title}>{t('languageTitle')}</Text>
        <Text style={styles.subtitle}>{t('languageSubtitle')}</Text>
      </View>

      <View style={styles.optionList}>
        {languageOptions.map((languagePreferenceOption) => {
          const isSelected = languagePreferenceOption === languagePreference;

          return (
            <Pressable
              accessibilityRole="button"
              key={languagePreferenceOption}
              onPress={() => setLanguagePreference(languagePreferenceOption)}
              style={({ pressed }) => [styles.optionRow, isSelected && { borderColor: theme.colors.primary, backgroundColor: theme.colors.cardTint }, pressed && styles.pressed]}>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>{getOptionTitle(languagePreferenceOption)}</Text>
                <Text style={styles.optionSubtitle}>{getOptionSubtitle(languagePreferenceOption)}</Text>
              </View>
              <View style={[styles.checkCircle, isSelected && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}>
                {isSelected ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.noteCard}>
        <Text style={styles.noteText}>Game rules are still shown in English. RTL layout support for Arabic can be added later.</Text>
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
  optionList: {
    gap: 7,
  },
  optionRow: {
    minHeight: 58,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
  optionText: {
    flex: 1,
    gap: 3,
  },
  optionTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
  },
  optionSubtitle: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteCard: {
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
  },
  noteText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  pressed: {
    opacity: 0.82,
  },
});
