import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  defaultScoreMateTheme,
  getSelectedTheme,
  scoreMateThemes,
  setSelectedTheme,
  type ScoreMateTheme,
  type ScoreMateThemeId,
} from '@/features/matches/themeStorage';

type ThemeSectionId = 'regular' | 'flags';

const themeSections: {
  id: ThemeSectionId;
  title: string;
  subtitle: string;
  themeIds: ScoreMateThemeId[];
}[] = [
  {
    id: 'regular',
    title: 'Regular & cool themes',
    subtitle: 'Classic app looks, dark mode, neon, royal, and soft colors.',
    themeIds: ['classic', 'ocean', 'sunset', 'forest', 'graphite', 'midnight', 'neon', 'royal', 'candy'],
  },
  {
    id: 'flags',
    title: 'Flag themes',
    subtitle: 'Country-inspired palettes for game nights.',
    themeIds: ['india', 'usa', 'brazil', 'canada', 'japan', 'mexico'],
  },
];

export default function ThemesScreen() {
  const [selectedTheme, setTheme] = useState<ScoreMateTheme>(defaultScoreMateTheme);
  const [openSections, setOpenSections] = useState<Record<ThemeSectionId, boolean>>({
    regular: true,
    flags: false,
  });

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      getSelectedTheme().then((storedTheme) => {
        if (isActive) {
          setTheme(storedTheme);
        }
      });

      return () => {
        isActive = false;
      };
    }, []),
  );

  async function handleSelectTheme(theme: ScoreMateTheme) {
    const updatedTheme = await setSelectedTheme(theme.id);
    setTheme(updatedTheme);
  }

  function toggleSection(sectionId: ThemeSectionId) {
    setOpenSections((currentSections) => ({
      ...currentSections,
      [sectionId]: !currentSections[sectionId],
    }));
  }

  function renderThemeCard(theme: ScoreMateTheme) {
    const isSelected = theme.id === selectedTheme.id;

    return (
      <Pressable
        accessibilityRole="button"
        key={theme.id}
        onPress={() => handleSelectTheme(theme)}
        style={({ pressed }) => [
          styles.themeCard,
          isSelected && { borderColor: theme.colors.primary, backgroundColor: theme.colors.cardTint },
          pressed && styles.pressed,
        ]}>
        <View style={styles.themeHeader}>
          <View style={[styles.themePreview, { backgroundColor: theme.colors.hero }]}>
            {theme.colors.logoBars.map((color, index) => (
              <View
                key={`${theme.id}-${color}-${index}`}
                style={[
                  styles.previewBar,
                  { backgroundColor: color, height: index === 0 ? 24 : index === 1 ? 18 : 12 },
                ]}
              />
            ))}
          </View>
          <View style={styles.themeTextBlock}>
            <Text style={styles.themeName}>{theme.name}</Text>
            <Text numberOfLines={2} style={styles.themeDescription}>{theme.description}</Text>
          </View>
          <View style={[styles.selectedDot, isSelected && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]} />
        </View>

        <View style={styles.swatchRow}>
          <View style={[styles.swatch, { backgroundColor: theme.colors.primary }]} />
          <View style={[styles.swatch, { backgroundColor: theme.colors.secondary }]} />
          <View style={[styles.swatch, { backgroundColor: theme.colors.accent }]} />
          <View style={[styles.swatch, { backgroundColor: theme.colors.cardTint }]} />
        </View>
      </Pressable>
    );
  }

  return (
    <ScrollView style={[styles.screen, { backgroundColor: selectedTheme.colors.screen }]} contentContainerStyle={styles.container}>
      <View style={[styles.heroCard, { backgroundColor: selectedTheme.colors.hero }]}>
        <Text style={styles.title}>Themes</Text>
        <Text style={styles.subtitle}>Change the look of ScoreMate on this device.</Text>
      </View>

      {themeSections.map((section) => {
        const sectionThemes = section.themeIds
          .map((themeId) => scoreMateThemes.find((theme) => theme.id === themeId))
          .filter((theme): theme is ScoreMateTheme => Boolean(theme));
        const selectedSectionTheme = sectionThemes.find((theme) => theme.id === selectedTheme.id);
        const isOpen = openSections[section.id];

        return (
          <View key={section.id} style={styles.sectionCard}>
            <Pressable accessibilityRole="button" onPress={() => toggleSection(section.id)} style={({ pressed }) => [styles.sectionToggle, pressed && styles.pressed]}>
              <View style={styles.sectionTextBlock}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text numberOfLines={1} style={styles.sectionSubtitle}>
                  {selectedSectionTheme ? `Selected: ${selectedSectionTheme.name}` : section.subtitle}
                </Text>
              </View>
              <Text style={styles.sectionArrow}>{isOpen ? '↑' : '↓'}</Text>
            </Pressable>

            {isOpen ? <View style={styles.themeList}>{sectionThemes.map((theme) => renderThemeCard(theme))}</View> : null}
          </View>
        );
      })}
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
    fontSize: 12,
    lineHeight: 17,
  },
  themeList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  sectionCard: {
    gap: 7,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 7,
  },
  sectionToggle: {
    minHeight: 42,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 10,
  },
  sectionTextBlock: {
    flex: 1,
    gap: 2,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '900',
  },
  sectionSubtitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
  },
  sectionArrow: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '900',
  },
  themeCard: {
    flexGrow: 1,
    flexBasis: '48%',
    minWidth: 150,
    gap: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 8,
  },
  themeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  themePreview: {
    width: 36,
    height: 36,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 2,
    paddingBottom: 7,
  },
  previewBar: {
    width: 4,
    borderRadius: 4,
  },
  themeTextBlock: {
    flex: 1,
    gap: 2,
  },
  themeName: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '900',
  },
  themeDescription: {
    color: '#64748B',
    fontSize: 11,
    lineHeight: 15,
  },
  selectedDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#CBD5E1',
  },
  swatchRow: {
    flexDirection: 'row',
    gap: 4,
  },
  swatch: {
    flex: 1,
    height: 6,
    borderRadius: 999,
  },
  pressed: {
    opacity: 0.82,
  },
});
