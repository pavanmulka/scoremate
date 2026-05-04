import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoMark}>
          <View style={styles.logoBarTall} />
          <View style={styles.logoBarMedium} />
          <View style={styles.logoBarShort} />
        </View>
        <View>
          <Text style={styles.title}>ScoreMate</Text>
          <Text style={styles.subtitle}>Score tracking for your favorite games</Text>
        </View>
      </View>

      <View style={styles.gamesList}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/games/least-count')}
          style={({ pressed }) => [styles.gameCard, pressed && styles.pressed]}>
          <View style={styles.gameAccent} />
          <View style={styles.gameText}>
            <Text style={styles.gameTitle}>Least Count</Text>
            <Text style={styles.gameDescription}>Track rounds, totals, and out limit</Text>
          </View>
        </Pressable>

        <View style={[styles.gameCard, styles.disabledCard]}>
          <View style={[styles.gameAccent, styles.disabledAccent]} />
          <View style={styles.gameText}>
            <Text style={[styles.gameTitle, styles.disabledText]}>More games coming soon</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    gap: 32,
    paddingHorizontal: 20,
    paddingTop: 72,
    paddingBottom: 32,
    backgroundColor: '#F4F6F8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  logoMark: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#111827',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
    paddingBottom: 12,
  },
  logoBarTall: {
    width: 7,
    height: 28,
    borderRadius: 3,
    backgroundColor: '#F4D35E',
  },
  logoBarMedium: {
    width: 7,
    height: 21,
    borderRadius: 3,
    backgroundColor: '#73D2DE',
  },
  logoBarShort: {
    width: 7,
    height: 14,
    borderRadius: 3,
    backgroundColor: '#F95738',
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
    maxWidth: 260,
  },
  gamesList: {
    gap: 14,
  },
  gameCard: {
    minHeight: 108,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 2,
  },
  pressed: {
    opacity: 0.8,
  },
  gameAccent: {
    alignSelf: 'stretch',
    width: 8,
    backgroundColor: '#2563EB',
  },
  gameText: {
    flex: 1,
    gap: 6,
    padding: 20,
  },
  gameTitle: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
  },
  gameDescription: {
    color: '#64748B',
    fontSize: 15,
    lineHeight: 21,
  },
  disabledCard: {
    backgroundColor: '#E9EEF4',
  },
  disabledAccent: {
    backgroundColor: '#94A3B8',
  },
  disabledText: {
    color: '#64748B',
  },
});
