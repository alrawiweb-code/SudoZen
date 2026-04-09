import { useState } from 'react';
import {
  ScrollView,
  Text,
  View,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useGame } from '@/lib/game-context';
import { Difficulty } from '@/lib/sudoku-engine';
import { LinearGradient } from 'expo-linear-gradient';
import { generatePuzzleFromDate } from '@/services/puzzleService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Helpers ──────────────────────────────────────────────────────────────────

// ─── Difficulty pill buttons ───────────────────────────────────────────────────

const DIFFICULTIES: { key: Difficulty; label: string }[] = [
  { key: 'easy', label: 'Beginner' },
  { key: 'medium', label: 'Intermediate' },
  { key: 'hard', label: 'Advanced' },
];

interface DifficultyPillsProps {
  active: Difficulty;
  onSelect: (d: Difficulty) => void;
}

function DifficultyPills({ active, onSelect }: DifficultyPillsProps) {
  return (
    <View style={styles.pillRow}>
      {DIFFICULTIES.map(({ key, label }) => {
        const isActive = active === key;
        return (
          <Pressable
            key={key}
            onPress={() => onSelect(key)}
            style={({ pressed }) => [
              styles.pill,
              isActive ? styles.pillActive : styles.pillInactive,
              pressed && { opacity: 0.75, transform: [{ scale: 0.97 }] },
            ]}
          >
            {isActive ? (
              <LinearGradient
                colors={['#6945c7', '#9c7afe']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.pillGradient}
              >
                <Text style={styles.pillActiveText}>{label}</Text>
              </LinearGradient>
            ) : (
              <Text style={styles.pillInactiveText}>{label}</Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Hero card (Today's Puzzle) ────────────────────────────────────────────────

function HeroCard({ onPlay }: { onPlay: () => void }) {
  return (
    <View style={styles.heroCard}>
      {/* Icon circle */}
      <View style={styles.heroIconCircle}>
        <Text style={styles.heroIcon}>🧘</Text>
      </View>

      <Text style={styles.heroTitle}>Today{"'"}s Puzzle</Text>
      <Text style={styles.heroSubtitle}>
        Train your brain daily with a curated zen experience.
      </Text>

      {/* Play Now button */}
      <Pressable
        onPress={onPlay}
        style={({ pressed }) => [
          styles.heroButtonWrapper,
          pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
        ]}
      >
        <LinearGradient
          colors={['#6945c7', '#9c7afe']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.heroButton}
        >
          <Text style={styles.heroButtonText}>Play Now</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

// ─── Stat mini-card ────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: string;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconCircle, { backgroundColor: accent }]}>
        <Text style={styles.statIcon}>{icon}</Text>
      </View>
      <View>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Home Screen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const { startNewGame, loadGame, stats } = useGame();
  const insets = useSafeAreaInsets();

  // Selected difficulty pill (defaults to medium)
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('medium');

  // ── handlers (all original logic, untouched) ──
  const handlePlayDaily = () => {
    const dailyPuzzle = generatePuzzleFromDate(new Date(), 'medium');
    loadGame(dailyPuzzle);
    router.push('../game');
  };

  const handleSelectDifficulty = (d: Difficulty) => {
    setSelectedDifficulty(d);
    startNewGame(d);
    router.push({ pathname: '../game', params: { difficulty: d } });
  };

  const handleViewStats = () => {
    router.push('../stats');
  };

  const paddingTop = Platform.OS === 'web' ? 24 : insets.top + 8;

  return (
    <View style={styles.root}>
      {/* Background ambient orbs */}
      <View style={styles.orbTopLeft} />
      <View style={styles.orbBottomRight} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>SudoZen</Text>
          <Text style={styles.headerTagline}>MINDFUL LOGIC</Text>
        </View>

        {/* ── Hero Card ── */}
        <HeroCard onPlay={handlePlayDaily} />

        {/* ── Choose Difficulty ── */}
        <Text style={styles.sectionLabel}>CHOOSE DIFFICULTY</Text>
        <DifficultyPills
          active={selectedDifficulty}
          onSelect={handleSelectDifficulty}
        />

        {/* ── Stats ── */}
        <View style={styles.statsRow}>
          <StatCard
            icon="🔥"
            label="Streak"
            value={`${stats.winStreak} days`}
            accent="rgba(252,163,174,0.18)"
          />
          <StatCard
            icon="🧩"
            label="Games"
            value={`${stats.gamesPlayed} Played`}
            accent="rgba(156,122,254,0.15)"
          />
        </View>

        {/* ── Divider ── */}
        <View style={styles.dividerRow}>
          <LinearGradient
            colors={['transparent', 'rgba(176,178,182,0.25)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.divider}
          />
        </View>

        {/* ── View Stats link ── */}
        <Pressable
          onPress={handleViewStats}
          style={({ pressed }) => [
            styles.statsLink,
            pressed && { opacity: 0.65 },
          ]}
        >
          <Text style={styles.statsLinkText}>View Full Statistics →</Text>
        </Pressable>

        {/* bottom breathing room */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const PRIMARY = '#6945c7';
const PRIMARY_LIGHT = '#9c7afe';
const SURFACE = '#faf9fb';
const ON_SURFACE = '#2f3336';
const ON_SURFACE_VARIANT = '#5c5f63';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SURFACE,
  },
  // background orbs
  orbTopLeft: {
    position: 'absolute',
    top: '-8%',
    left: '-10%',
    width: '55%',
    height: '35%',
    borderRadius: 9999,
    backgroundColor: 'rgba(156,122,254,0.12)',
  } as any,
  orbBottomRight: {
    position: 'absolute',
    bottom: '-8%',
    right: '-8%',
    width: '45%',
    height: '30%',
    borderRadius: 9999,
    backgroundColor: 'rgba(252,163,174,0.08)',
  } as any,

  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },

  // ── Header ──
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: PRIMARY,
    letterSpacing: -0.3,
  },
  headerTagline: {
    fontSize: 10,
    fontWeight: '300',
    color: '#9ca3af',
    letterSpacing: 5,
    marginTop: 2,
  },

  // ── Hero card ──
  heroCard: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    // shadow
    shadowColor: '#2f3336',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 4,
  },
  heroIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(156,122,254,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroIcon: {
    fontSize: 28,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: ON_SURFACE,
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    fontWeight: '300',
    color: ON_SURFACE_VARIANT,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  heroButtonWrapper: {
    width: '100%',
    borderRadius: 50,
    overflow: 'hidden',
  },
  heroButton: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 50,
  },
  heroButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // ── Section label ──
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(92,95,99,0.6)',
    letterSpacing: 4,
    marginBottom: 12,
    paddingHorizontal: 4,
  },

  // ── Difficulty pills ──
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 28,
  },
  pill: {
    flex: 1,
    borderRadius: 50,
    overflow: 'hidden',
  },
  pillActive: {},
  pillInactive: {
    backgroundColor: '#f3f3f6',
    paddingVertical: 14,
    alignItems: 'center',
  },
  pillGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 50,
  },
  pillActiveText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  pillInactiveText: {
    color: ON_SURFACE,
    fontSize: 13,
    fontWeight: '500',
  },

  // ── Stats row ──
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    shadowColor: '#2f3336',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  statIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIcon: {
    fontSize: 20,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: ON_SURFACE_VARIANT,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: ON_SURFACE,
  },

  // ── Divider ──
  dividerRow: {
    alignItems: 'center',
    marginBottom: 20,
  },
  divider: {
    width: 96,
    height: 4,
    borderRadius: 2,
  },

  // ── Stats link ──
  statsLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  statsLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIMARY_LIGHT,
    letterSpacing: 0.2,
  },
});
