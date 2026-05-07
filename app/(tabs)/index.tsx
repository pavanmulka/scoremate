import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  customGamePresetId,
  gamePresetCategories,
  getGamePreset,
  getGamePresetsByCategory,
  getRecentGamePresets,
  type GamePresetCategoryFilter,
} from '@/features/matches/gamePresets';
import { createReplayMatch } from '@/features/matches/matchFactory';
import { deleteMatch, getMatches, saveMatch } from '@/features/matches/matchStorage';
import { savePlayerNames } from '@/features/matches/playerStorage';
import { getScoringPreset, getScoringRuleSummary, scoringPresets } from '@/features/matches/scoringRules';
import { getPlayerStandings } from '@/features/matches/scoreCalculator';
import { formatMatchShareText } from '@/features/matches/shareFormatter';
import { getHasSeenWelcome, markWelcomeSeen } from '@/features/matches/welcomeStorage';
import { useScoreMateTheme } from '@/hooks/use-scoremate-theme';
import type { Match, ScoringMode } from '@/features/matches/types';

const matchFilters = ['all', 'live', 'completed'] as const;

const welcomeFeatures: {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    title: 'Many games',
    description: 'Choose presets or use Custom Scorekeeper',
    icon: 'apps-outline',
  },
  {
    title: 'Game rules',
    description: 'View quick rules when needed',
    icon: 'book-outline',
  },
  {
    title: 'Players or teams',
    description: 'Score individuals or team games',
    icon: 'people-outline',
  },
  {
    title: 'Offline history',
    description: 'Matches stay on this phone',
    icon: 'phone-portrait-outline',
  },
];

type MatchFilter = (typeof matchFilters)[number];

function getTeamCount(match: Match) {
  return new Set(match.players.map((player) => player.teamName).filter(Boolean)).size;
}

function formatUpdatedDate(updatedAt: string) {
  const date = new Date(updatedAt);

  if (Number.isNaN(date.getTime())) {
    return 'Updated recently';
  }

  return `Updated ${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}

export default function HomeScreen() {
  const theme = useScoreMateTheme();
  const insets = useSafeAreaInsets();
  const [matches, setMatches] = useState<Match[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [matchFilter, setMatchFilter] = useState<MatchFilter>('all');
  const [selectedGamePresetId, setSelectedGamePresetId] = useState('least-count-cards');
  const [selectedScoringMode, setSelectedScoringMode] = useState<ScoringMode>('outLimit');
  const [isGamePickerOpen, setIsGamePickerOpen] = useState(false);
  const [isScoringPickerOpen, setIsScoringPickerOpen] = useState(false);
  const [isRecentMatchesOpen, setIsRecentMatchesOpen] = useState(false);
  const [selectedGameCategory, setSelectedGameCategory] = useState<GamePresetCategoryFilter>('All');
  const [rulesModalPresetId, setRulesModalPresetId] = useState<string | null>(null);
  const [isWelcomeVisible, setIsWelcomeVisible] = useState(false);

  useEffect(() => {
    let isActive = true;

    getHasSeenWelcome()
      .then((hasSeenWelcome) => {
        if (isActive && !hasSeenWelcome) {
          setIsWelcomeVisible(true);
        }
      })
      .catch(() => {
        if (isActive) {
          setIsWelcomeVisible(true);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

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

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredMatches = matches.filter((match) => {
    const isCompleted = match.status === 'completed';
    const statusMatches = matchFilter === 'all' || (matchFilter === 'completed' ? isCompleted : !isCompleted);

    if (!statusMatches) {
      return false;
    }

    if (!normalizedSearchQuery) {
      return true;
    }

    const gamePresetLabel = match.gamePresetName ?? getGamePreset(match.gamePresetId)?.shortTitle ?? '';
    const searchableText = [match.name, gamePresetLabel, getScoringRuleSummary(match), ...match.players.map((player) => player.name)]
      .join(' ')
      .toLowerCase();

    return searchableText.includes(normalizedSearchQuery);
  });
  const visibleMatches = filteredMatches;
  const liveMatchCount = matches.filter((match) => match.status !== 'completed').length;
  const completedMatchCount = matches.length - liveMatchCount;
  const selectedGamePreset = getGamePreset(selectedGamePresetId);
  const selectedScoringPreset = getScoringPreset(selectedScoringMode);
  const rulesModalPreset = getGamePreset(rulesModalPresetId);
  const recentGamePresets = useMemo(() => getRecentGamePresets(matches), [matches]);
  const visibleGamePresets = useMemo(
    () => (selectedGameCategory === 'Recent' ? recentGamePresets : getGamePresetsByCategory(selectedGameCategory)),
    [recentGamePresets, selectedGameCategory],
  );
  const createMatchHref = `/matches/create?gamePresetId=${encodeURIComponent(selectedGamePresetId)}&scoringMode=${encodeURIComponent(selectedScoringMode)}` as Href;

  function handleSelectHomeGamePreset(presetId: string) {
    const preset = getGamePreset(presetId);

    setSelectedGamePresetId(preset?.id ?? customGamePresetId);

    if (preset) {
      setSelectedScoringMode(preset.scoringMode);
    } else {
      setSelectedScoringMode('highestScoreWins');
    }

    setIsGamePickerOpen(false);
  }

  function handleSelectHomeScoringMode(mode: ScoringMode) {
    setSelectedGamePresetId(customGamePresetId);
    setSelectedScoringMode(mode);
    setIsScoringPickerOpen(false);
  }

  function handleDeleteMatch(match: Match) {
    Alert.alert('Delete match?', `Delete "${match.name}" and all of its rounds?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updatedMatches = await deleteMatch(match.id);
          setMatches(updatedMatches);
        },
      },
    ]);
  }

  async function handleShareMatch(match: Match) {
    try {
      await Share.share({
        message: formatMatchShareText(match),
        title: `${match.name} scoreboard`,
      });
    } catch {
      Alert.alert('Share failed', 'Could not open the share sheet. Try again.');
    }
  }

  async function handleReplayMatch(match: Match) {
    const replayMatch = createReplayMatch(match);

    const savedMatch = await saveMatch(replayMatch);
    await savePlayerNames(replayMatch.players.map((player) => player.name));
    setMatches(await getMatches());
    router.push(`/matches/scoreboard?matchId=${encodeURIComponent(savedMatch.id)}` as Href);
  }

  async function handleDismissWelcome() {
    try {
      await markWelcomeSeen();
    } finally {
      setIsWelcomeVisible(false);
    }
  }

  return (
    <>
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.keyboardView, { backgroundColor: theme.colors.screen }]}>
    <ScrollView
      automaticallyAdjustKeyboardInsets
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      scrollIndicatorInsets={{ bottom: insets.bottom + 16 }}
      style={[styles.screen, { backgroundColor: theme.colors.screen }]}
      contentContainerStyle={[styles.container, { paddingTop: Math.max(14, insets.top + 8), paddingBottom: Math.max(26, insets.bottom + 26) }]}>
      <View style={[styles.homeHeader, { backgroundColor: theme.colors.hero }]}>
        <View style={styles.homeTopRow}>
          <View style={styles.brandRow}>
            <View style={styles.logoMark}>
              <View style={[styles.logoBadge, { backgroundColor: theme.colors.hero }]}>
                <Text style={styles.logoInitial}>S</Text>
              </View>
              <View style={styles.logoBarsRow}>
                <View style={[styles.logoBarTall, { backgroundColor: theme.colors.logoBars[0] }]} />
                <View style={[styles.logoBarMedium, { backgroundColor: theme.colors.logoBars[1] }]} />
                <View style={[styles.logoBarShort, { backgroundColor: theme.colors.logoBars[2] }]} />
              </View>
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.kicker, { color: theme.colors.accent }]}>Scores for any game</Text>
              <Text style={styles.title}>ScoreMate</Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/matches/app-settings' as Href)}
            style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}>
            <Ionicons name="settings-outline" size={18} color="#FFFFFF" />
          </Pressable>
        </View>

        <Text style={styles.subtitle}>Start a match, add players, and track scores offline.</Text>
        <View style={styles.heroChipRow}>
          <View style={styles.heroChip}>
            <Text style={styles.heroChipText}>Offline</Text>
          </View>
          <View style={styles.heroChip}>
            <Text style={styles.heroChipText}>No login</Text>
          </View>
        </View>
      </View>

      <View style={styles.quickStartCard}>
        <View style={styles.quickStartHeader}>
          <View>
            <Text style={styles.quickStartTitle}>Start New Match</Text>
            <Text style={styles.quickStartHint}>Choose a game, then add players.</Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(createMatchHref)}
          style={({ pressed }) => [styles.primaryButton, styles.quickStartPrimaryButton, { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primaryShadow }, pressed && styles.pressed]}>
          <Text style={styles.primaryButtonText}>Start New Match</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => setIsGamePickerOpen((value) => !value)}
          style={({ pressed }) => [
            styles.quickSelectorRow,
            isGamePickerOpen && styles.quickSelectorRowOpen,
            pressed && styles.pressed,
          ]}>
          <View style={styles.quickSelectorText}>
            <Text style={styles.quickSelectorLabel}>Select game</Text>
            <Text numberOfLines={1} style={styles.quickSelectorValue}>{selectedGamePreset?.title ?? 'Custom Scorekeeper'}</Text>
          </View>
          <View style={styles.quickSelectorActions}>
            {selectedGamePreset ? (
              <Pressable accessibilityRole="button" onPress={() => setRulesModalPresetId(selectedGamePreset.id)} style={({ pressed }) => [styles.rulesButton, pressed && styles.pressed]}>
                <Text style={styles.rulesButtonText}>Rules</Text>
              </Pressable>
            ) : null}
            <View style={styles.quickArrowButton}>
              <Text style={styles.quickArrowButtonText}>{isGamePickerOpen ? '↑' : '↓'}</Text>
            </View>
          </View>
        </Pressable>

        {isGamePickerOpen ? (
          <View style={styles.quickPickerList}>
            <View style={styles.categoryRow}>
              {gamePresetCategories.map((category) => {
                const isSelected = selectedGameCategory === category;

                return (
                  <Pressable
                    accessibilityRole="button"
                    key={category}
                    onPress={() => setSelectedGameCategory(category)}
                    style={({ pressed }) => [
                      styles.categoryChip,
                      isSelected && { backgroundColor: theme.colors.secondary, borderColor: theme.colors.secondaryText },
                      pressed && styles.pressed,
                    ]}>
                    <Text style={[styles.categoryChipText, isSelected && { color: theme.colors.secondaryText }]}>{category}</Text>
                  </Pressable>
                );
              })}
            </View>

            {selectedGameCategory === 'All' ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => handleSelectHomeGamePreset(customGamePresetId)}
                style={({ pressed }) => [
                  styles.quickOptionRow,
                  selectedGamePresetId === customGamePresetId && { backgroundColor: theme.colors.softAccent, borderColor: theme.colors.accent },
                  pressed && styles.pressed,
                ]}>
                <View style={styles.quickOptionText}>
                  <Text style={[styles.quickOptionTitle, selectedGamePresetId === customGamePresetId && { color: theme.colors.secondaryText }]}>Custom Scorekeeper</Text>
                  <Text style={[styles.quickOptionDescription, selectedGamePresetId === customGamePresetId && { color: theme.colors.secondaryText }]}>Works for any manual score game.</Text>
                </View>
                <Text style={[styles.quickOptionMeta, selectedGamePresetId === customGamePresetId && { color: theme.colors.secondaryText }]}>Default</Text>
              </Pressable>
            ) : null}

            {selectedGameCategory === 'Recent' && visibleGamePresets.length === 0 ? (
              <View style={styles.emptyPickerCard}>
                <Text style={styles.emptyPickerTitle}>No recent games yet</Text>
                <Text style={styles.emptyPickerText}>Start a game once and it will show here for faster setup next time.</Text>
              </View>
            ) : null}

            {visibleGamePresets.map((preset) => {
              const isSelected = selectedGamePresetId === preset.id;

              return (
                <Pressable
                  accessibilityRole="button"
                  key={preset.id}
                  onPress={() => handleSelectHomeGamePreset(preset.id)}
                  style={({ pressed }) => [
                    styles.quickOptionRow,
                    isSelected && { backgroundColor: theme.colors.softAccent, borderColor: theme.colors.accent },
                    pressed && styles.pressed,
                  ]}>
                  <View style={styles.quickOptionText}>
                    <Text style={[styles.quickOptionTitle, isSelected && { color: theme.colors.secondaryText }]}>{preset.title}</Text>
                    <Text style={[styles.quickOptionDescription, isSelected && { color: theme.colors.secondaryText }]}>{preset.description}</Text>
                  </View>
                  <Text style={[styles.quickOptionMeta, isSelected && { color: theme.colors.secondaryText }]}>{preset.category}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          onPress={() => setIsScoringPickerOpen((value) => !value)}
          style={({ pressed }) => [
            styles.quickSelectorRow,
            isScoringPickerOpen && styles.quickSelectorRowOpen,
            pressed && styles.pressed,
          ]}>
          <View style={styles.quickSelectorText}>
            <Text style={styles.quickSelectorLabel}>Scoring style</Text>
            <Text numberOfLines={1} style={styles.quickSelectorValue}>{selectedScoringPreset.title}</Text>
          </View>
          <View style={styles.quickArrowButton}>
            <Text style={styles.quickArrowButtonText}>{isScoringPickerOpen ? '↑' : '↓'}</Text>
          </View>
        </Pressable>

        {isScoringPickerOpen ? (
          <View style={styles.quickPickerList}>
            {scoringPresets.map((preset) => {
              const isSelected = preset.mode === selectedScoringMode;

              return (
                <Pressable
                  accessibilityRole="button"
                  key={preset.mode}
                  onPress={() => handleSelectHomeScoringMode(preset.mode)}
                  style={({ pressed }) => [
                    styles.quickOptionRow,
                    isSelected && { backgroundColor: theme.colors.softAccent, borderColor: theme.colors.accent },
                    pressed && styles.pressed,
                  ]}>
                  <View style={styles.quickOptionText}>
                    <Text style={[styles.quickOptionTitle, isSelected && { color: theme.colors.secondaryText }]}>{preset.title}</Text>
                    <Text style={[styles.quickOptionDescription, isSelected && { color: theme.colors.secondaryText }]}>{preset.description}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : null}

      </View>

      <View style={styles.capabilityCard}>
        <View style={styles.capabilityHeader}>
          <Text style={styles.capabilityTitle}>What you can do</Text>
        </View>
        <View style={styles.capabilityGrid}>
          {welcomeFeatures.map((feature) => (
            <View key={feature.title} style={styles.capabilityItem}>
              <View style={[styles.capabilityIcon, { backgroundColor: theme.colors.cardTint }]}>
                <Ionicons name={feature.icon} size={15} color={theme.colors.primaryShadow} />
              </View>
              <Text style={styles.capabilityItemText}>{feature.title}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.recentSectionCard}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setIsRecentMatchesOpen((value) => !value)}
          style={({ pressed }) => [styles.recentToggleHeader, pressed && styles.pressed]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent matches</Text>
            <Text style={styles.sectionHint}>{matches.length === 1 ? '1 saved match.' : `${matches.length} saved matches.`}</Text>
            {!isRecentMatchesOpen ? <Text style={styles.sectionSubHint}>Tap to continue a previous game.</Text> : null}
          </View>
          <View style={styles.quickArrowButton}>
            <Text style={styles.quickArrowButtonText}>{isRecentMatchesOpen ? '↑' : '↓'}</Text>
          </View>
        </Pressable>

        {isRecentMatchesOpen ? (
          <>
            {matches.length > 0 ? (
              <View style={styles.matchToolsCard}>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={setSearchQuery}
                  placeholder="Search matches or players"
                  placeholderTextColor="#94A3B8"
                  style={styles.searchInput}
                  value={searchQuery}
                />
                <View style={styles.filterRow}>
                  {matchFilters.map((filter) => {
                    const isSelected = filter === matchFilter;
                    const label = filter === 'all' ? `All ${matches.length}` : filter === 'live' ? `Live ${liveMatchCount}` : `Completed ${completedMatchCount}`;

                    return (
                      <Pressable
                        accessibilityRole="button"
                        key={filter}
                        onPress={() => setMatchFilter(filter)}
                        style={({ pressed }) => [
                          styles.filterChip,
                          isSelected && { backgroundColor: theme.colors.secondary, borderColor: theme.colors.secondaryText },
                          pressed && styles.pressed,
                        ]}>
                        <Text style={[styles.filterChipText, isSelected && { color: theme.colors.secondaryText }]}>{label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {matches.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No matches yet</Text>
                <Text style={styles.emptyText}>Create one match, add players, then score rounds from the scoreboard.</Text>
              </View>
            ) : (
              <View style={styles.matchList}>
          {visibleMatches.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No matches found</Text>
              <Text style={styles.emptyText}>Try another search or filter.</Text>
            </View>
          ) : null}
          {visibleMatches.map((match) => {
            const standings = getPlayerStandings(match);
            const winner = standings.find((standing) => standing.isWinner);
            const leader = winner ?? standings.find((standing) => standing.isLeader);
            const isCompleted = match.status === 'completed';
            const gamePresetLabel = match.gamePresetName ?? getGamePreset(match.gamePresetId)?.shortTitle;
            const teamCount = getTeamCount(match);

            return (
              <Swipeable
                key={match.id}
                overshootRight={false}
                renderRightActions={() => (
                  <View style={styles.swipeActions}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => handleShareMatch(match)}
                      style={({ pressed }) => [styles.swipeShareAction, pressed && styles.pressed]}>
                      <Text style={styles.swipeActionText}>Share</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => handleReplayMatch(match)}
                      style={({ pressed }) => [styles.swipeReplayAction, pressed && styles.pressed]}>
                      <Text style={styles.swipeActionText}>Replay</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => router.push(`/matches/settings?matchId=${encodeURIComponent(match.id)}` as Href)}
                      style={({ pressed }) => [styles.swipeEditAction, pressed && styles.pressed]}>
                      <Text style={styles.swipeActionText}>Edit</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => handleDeleteMatch(match)}
                      style={({ pressed }) => [styles.swipeDeleteAction, pressed && styles.pressed]}>
                      <Text style={styles.swipeActionText}>Delete</Text>
                    </Pressable>
                  </View>
                )}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push(`/matches/scoreboard?matchId=${encodeURIComponent(match.id)}` as Href)}
                  style={({ pressed }) => [styles.matchCard, isCompleted && styles.completedMatchCard, pressed && styles.pressed]}>
                  <View style={styles.matchOpenArea}>
                  <View style={styles.matchCardTop}>
                    <Text style={styles.matchName}>{match.name}</Text>
                    <View style={styles.matchMetaBlock}>
                      <View style={[styles.matchStatusChip, isCompleted ? styles.completedStatusChip : styles.liveStatusChip]}>
                      <Text style={[styles.matchStatusText, isCompleted ? styles.completedStatusText : styles.liveStatusText]}>
                          {isCompleted ? 'Completed' : 'Live'}
                        </Text>
                      </View>
                      <Text style={styles.matchMeta}>{match.players.length} players</Text>
                      <Text style={styles.matchUpdatedAt}>{formatUpdatedDate(match.updatedAt)}</Text>
                    </View>
                  </View>
                  <Text style={styles.matchDetail}>
                    {gamePresetLabel ? `${gamePresetLabel} - ` : ''}{teamCount > 1 ? `${teamCount} teams - ` : ''}{getScoringRuleSummary(match)} - {match.rounds.length} rounds
                  </Text>
                  {leader ? <Text style={styles.winnerLine}>{isCompleted ? 'Final' : winner ? 'Winner' : 'Leader'}: {leader.player.name}</Text> : null}
                  <Text style={styles.swipeHint}>Swipe left for actions</Text>
                  </View>
                </Pressable>
              </Swipeable>
            );
          })}
              </View>
            )}
          </>
        ) : null}
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
    <Modal animationType="slide" onRequestClose={() => setRulesModalPresetId(null)} transparent visible={Boolean(rulesModalPreset)}>
      <View style={styles.rulesOverlay}>
        <View style={[styles.rulesSheet, { backgroundColor: theme.colors.screen }]}>
          {rulesModalPreset ? (
            <ScrollView contentContainerStyle={styles.rulesSheetContent}>
              <View style={[styles.rulesHero, { backgroundColor: theme.colors.hero }]}>
                <Text style={[styles.kicker, { color: theme.colors.accent }]}>Game rules</Text>
                <Text style={styles.rulesSheetTitle}>{rulesModalPreset.title}</Text>
                <Text style={styles.rulesSheetSubtitle}>{rulesModalPreset.description}</Text>
              </View>
              <View style={styles.rulesCard}>
                <Text style={styles.rulesLabel}>Objective</Text>
                <Text style={styles.rulesText}>{rulesModalPreset.rules.objective}</Text>
                <Text style={styles.rulesLabel}>Scoring</Text>
                {rulesModalPreset.rules.scoring.map((rule) => (
                  <Text key={rule} style={styles.rulesText}>- {rule}</Text>
                ))}
                <Text style={styles.rulesLabel}>Winning</Text>
                <Text style={styles.rulesText}>{rulesModalPreset.rules.winning}</Text>
                {rulesModalPreset.rules.notes?.map((note) => (
                  <Text key={note} style={styles.rulesNote}>Note: {note}</Text>
                ))}
              </View>
              <Pressable accessibilityRole="button" onPress={() => setRulesModalPresetId(null)} style={({ pressed }) => [styles.rulesCloseButton, { backgroundColor: theme.colors.primary }, pressed && styles.pressed]}>
                <Text style={styles.rulesCloseButtonText}>Done</Text>
              </Pressable>
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
    <Modal animationType="fade" onRequestClose={handleDismissWelcome} transparent visible={isWelcomeVisible}>
      <View style={styles.welcomeOverlay}>
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeHeroIcon}>
            <Ionicons name="trophy-outline" size={24} color="#FFFFFF" />
          </View>
          <Text style={styles.welcomeTitle}>Welcome to ScoreMate</Text>
          <Text style={styles.welcomeSubtitle}>
            Track scores for cards, board games, sports, and group games — no login or internet needed.
          </Text>
          <View style={styles.welcomeFeatureList}>
            {welcomeFeatures.map((feature) => (
              <View key={feature.title} style={styles.welcomeFeatureRow}>
                <View style={[styles.welcomeFeatureIcon, { backgroundColor: theme.colors.cardTint }]}>
                  <Ionicons name={feature.icon} size={17} color={theme.colors.primaryShadow} />
                </View>
                <View style={styles.welcomeFeatureText}>
                  <Text style={styles.welcomeFeatureTitle}>{feature.title}</Text>
                  <Text style={styles.welcomeFeatureDescription}>{feature.description}</Text>
                </View>
              </View>
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={handleDismissWelcome}
            style={({ pressed }) => [styles.welcomePrimaryButton, { backgroundColor: theme.colors.primary }, pressed && styles.pressed]}>
            <Text style={styles.welcomePrimaryButtonText}>Start scoring</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={handleDismissWelcome} style={({ pressed }) => [styles.welcomeSecondaryButton, pressed && styles.pressed]}>
            <Text style={styles.welcomeSecondaryButtonText}>Maybe later</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
    </>
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
    gap: 12,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 26,
  },
  homeHeader: {
    gap: 8,
    borderRadius: 8,
    backgroundColor: '#172033',
    padding: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 5,
  },
  homeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  brandRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  logoMark: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    padding: 5,
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  logoBadge: {
    width: 20,
    height: 20,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoInitial: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  logoBarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    gap: 3,
  },
  logoBarTall: {
    width: 6,
    height: 20,
    borderRadius: 3,
    backgroundColor: '#F4D35E',
  },
  logoBarMedium: {
    width: 6,
    height: 15,
    borderRadius: 3,
    backgroundColor: '#73D2DE',
  },
  logoBarShort: {
    width: 6,
    height: 10,
    borderRadius: 3,
    backgroundColor: '#F95738',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '900',
    lineHeight: 27,
  },
  kicker: {
    color: '#66E3D2',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  subtitle: {
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 18,
  },
  heroChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  heroChip: {
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  heroChipText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '900',
  },
  settingsButton: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  quickActionRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
  },
  savedCountPill: {
    minWidth: 86,
    borderRadius: 8,
    backgroundColor: '#26344D',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  savedCountValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 23,
  },
  savedCountLabel: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '800',
  },
  quickStartCard: {
    gap: 10,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    padding: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  quickStartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  quickStartTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '900',
  },
  quickStartHint: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  quickSelectorRow: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D8DEE8',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  quickSelectorRowOpen: {
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  quickSelectorText: {
    flex: 1,
    gap: 2,
  },
  quickSelectorActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickSelectorLabel: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  quickSelectorValue: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '900',
  },
  quickArrowButton: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickArrowButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  rulesButton: {
    alignSelf: 'center',
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  rulesButtonText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '900',
  },
  quickPickerList: {
    gap: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 6,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingBottom: 4,
  },
  categoryChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  categoryChipText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '900',
  },
  quickOptionRow: {
    minHeight: 46,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  emptyPickerCard: {
    gap: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    padding: 12,
  },
  emptyPickerTitle: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '900',
  },
  emptyPickerText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  quickOptionText: {
    flex: 1,
    gap: 2,
  },
  quickOptionTitle: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '900',
  },
  quickOptionDescription: {
    color: '#64748B',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
  },
  quickOptionMeta: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  quickStartPrimaryButton: {
    flex: 0,
    minHeight: 50,
  },
  capabilityCard: {
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
  capabilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  capabilityTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
  },
  capabilityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  capabilityItem: {
    flexGrow: 1,
    flexBasis: '47%',
    minHeight: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 8,
  },
  capabilityIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  capabilityItemText: {
    flex: 1,
    color: '#334155',
    fontSize: 12,
    fontWeight: '900',
  },
  continueCard: {
    minHeight: 64,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#FFF7ED',
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
  continueTextBlock: {
    flex: 1,
    gap: 2,
  },
  continueKicker: {
    color: '#14B8A6',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  continueTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '900',
  },
  continueMeta: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '800',
  },
  continueButton: {
    minWidth: 70,
    minHeight: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F97316',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
    flexWrap: 'wrap',
  },
  heroMetaCard: {
    minWidth: 128,
    borderRadius: 8,
    backgroundColor: '#26344D',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  proBadge: {
    minHeight: 58,
    borderRadius: 8,
    backgroundColor: '#29354A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  proBadgeActive: {
    backgroundColor: '#FEF3C7',
  },
  proBadgeText: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '900',
  },
  proBadgeTextActive: {
    color: '#92400E',
  },
  statsButton: {
    minHeight: 58,
    borderRadius: 8,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  statsButtonText: {
    color: '#1D4ED8',
    fontSize: 15,
    fontWeight: '900',
  },
  heroMetaValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 28,
  },
  heroMetaLabel: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '800',
  },
  primaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F97316',
    shadowColor: '#C2410C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.82,
  },
  proPanel: {
    gap: 14,
    borderRadius: 8,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 2,
  },
  proPanelLocked: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  proPanelActive: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  proPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  proPanelTitleBlock: {
    flex: 1,
    gap: 3,
  },
  proPanelKicker: {
    color: '#14B8A6',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  proPanelTitle: {
    color: '#111827',
    fontSize: 21,
    fontWeight: '900',
  },
  proPanelButton: {
    borderRadius: 8,
    backgroundColor: '#172033',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  proPanelButtonActive: {
    backgroundColor: '#F97316',
  },
  proPanelButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  proPanelButtonTextActive: {
    color: '#FFFFFF',
  },
  toolGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  toolChip: {
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  toolChipActive: {
    backgroundColor: '#FFEDD5',
  },
  toolChipText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '800',
  },
  toolChipTextActive: {
    color: '#C2410C',
  },
  sectionHeader: {
    flex: 1,
    gap: 4,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
  },
  sectionHint: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 17,
  },
  sectionSubHint: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
  },
  recentSectionCard: {
    gap: 10,
  },
  recentToggleHeader: {
    minHeight: 42,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    padding: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  matchToolsCard: {
    gap: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    padding: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  searchInput: {
    minHeight: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 12,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  filterChipText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '900',
  },
  emptyCard: {
    gap: 8,
    borderRadius: 8,
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
    gap: 8,
  },
  matchCard: {
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 4,
    borderLeftColor: '#14B8A6',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  completedMatchCard: {
    borderLeftColor: '#F97316',
    backgroundColor: '#FFFBF7',
  },
  matchOpenArea: {
    flex: 1,
    gap: 5,
    padding: 11,
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
    fontSize: 16,
    fontWeight: '800',
  },
  matchMeta: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
  },
  matchUpdatedAt: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
  },
  matchMetaBlock: {
    alignItems: 'flex-end',
    gap: 4,
  },
  matchStatusChip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  liveStatusChip: {
    backgroundColor: '#D9F9F3',
  },
  completedStatusChip: {
    backgroundColor: '#FEF3C7',
  },
  matchStatusText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  liveStatusText: {
    color: '#0F766E',
  },
  completedStatusText: {
    color: '#92400E',
  },
  matchDetail: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 17,
  },
  limitCard: {
    gap: 6,
    borderRadius: 8,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA74',
    padding: 18,
  },
  limitTitle: {
    color: '#9A3412',
    fontSize: 18,
    fontWeight: '900',
  },
  limitText: {
    color: '#C2410C',
    fontSize: 14,
    lineHeight: 20,
  },
  winnerLine: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '800',
  },
  swipeHint: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  swipeActions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 8,
  },
  swipeShareAction: {
    width: 74,
    borderRadius: 8,
    backgroundColor: '#0EA5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeReplayAction: {
    width: 74,
    borderRadius: 8,
    backgroundColor: '#14B8A6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeEditAction: {
    width: 74,
    borderRadius: 8,
    backgroundColor: '#64748B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeDeleteAction: {
    width: 74,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  rulesOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  rulesSheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: '#EEF2F6',
    overflow: 'hidden',
  },
  rulesSheetContent: {
    gap: 14,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 28,
  },
  rulesHero: {
    gap: 6,
    borderRadius: 8,
    backgroundColor: '#172033',
    padding: 18,
  },
  rulesSheetTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34,
  },
  rulesSheetSubtitle: {
    color: '#CBD5E1',
    fontSize: 15,
    lineHeight: 21,
  },
  rulesCard: {
    gap: 7,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
  },
  rulesLabel: {
    color: '#14B8A6',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  rulesText: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
  },
  rulesNote: {
    color: '#92400E',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
  },
  rulesCloseButton: {
    minHeight: 54,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F97316',
  },
  rulesCloseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  welcomeOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.52)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  welcomeCard: {
    width: '100%',
    maxWidth: 430,
    gap: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 8,
  },
  welcomeHeroIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeTitle: {
    color: '#111827',
    fontSize: 23,
    fontWeight: '900',
    lineHeight: 28,
  },
  welcomeSubtitle: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  welcomeFeatureList: {
    gap: 7,
  },
  welcomeFeatureRow: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 9,
  },
  welcomeFeatureIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeFeatureText: {
    flex: 1,
    gap: 2,
  },
  welcomeFeatureTitle: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '900',
  },
  welcomeFeatureDescription: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  welcomePrimaryButton: {
    minHeight: 46,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F97316',
  },
  welcomePrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  welcomeSecondaryButton: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  welcomeSecondaryButtonText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '900',
  },
});
