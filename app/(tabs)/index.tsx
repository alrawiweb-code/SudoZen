import { useState, useCallback } from 'react';
import {
  ScrollView,
  Text,
  View,
  Pressable,
  StyleSheet,
  Platform,
  Modal,
} from 'react-native';
import { Lock, Brain, Grid3X3, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useGame } from '@/lib/game-context';
import { Difficulty } from '@/lib/sudoku-engine';
import { LinearGradient } from 'expo-linear-gradient';
import { generatePuzzleFromDate } from '@/services/puzzleService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/lib/theme-context';
import { BlurView } from 'expo-blur';
import { StreakTracker } from '@/components/streak-tracker';


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
  onLockedPress: (d: Difficulty) => void;
  stats: any;
}

function DifficultyPills({ active, onSelect, onLockedPress, stats }: DifficultyPillsProps) {
  const { theme } = useAppTheme();

  const isLocked = useCallback((key: Difficulty) => {
    if (key === 'easy') return false;
    if (key === 'medium') return stats.difficultyStats.easy.won === 0;
    if (key === 'hard') return stats.difficultyStats.medium.won === 0;
    return false;
  }, [stats]);

  return (
    <View style={styles.pillRow}>
      {DIFFICULTIES.map(({ key, label }) => {
        const isActive = active === key;
        const locked = isLocked(key);

        return (
          <Pressable
            key={key}
            onPress={() => (locked ? onLockedPress(key) : onSelect(key))}
            style={({ pressed }) => [
              styles.pill,
              isActive ? styles.pillActive : styles.pillInactive,
              // Background color memoization equivalent (inline but stable mapping)
              !isActive && { 
                backgroundColor: theme.background === '#0F172A' ? '#1E293B' : '#E5E7EB' 
              },
              locked && { opacity: 0.6 },
              pressed && !locked && { opacity: 0.75, transform: [{ scale: 0.97 }] },
              pressed && locked && { transform: [{ translateX: 2 }] },
            ]}
          >
            {isActive && !locked ? (
              <LinearGradient
                colors={[theme.accent, theme.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.pillGradient}
              >
                <Text style={styles.pillActiveText} numberOfLines={1}>{label}</Text>
              </LinearGradient>
            ) : (
              <View style={styles.pillContent}>
                <Text 
                  style={[styles.pillInactiveText, { color: theme.textPrimary }]} 
                  numberOfLines={1}
                >
                  {label}
                </Text>
                {locked && (
                  <Lock size={12} color={theme.textPrimary} style={{ marginLeft: 4 }} />
                )}
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Locked level popup ────────────────────────────────────────────────────────

function LockedLevelPopup({ visible, difficulty, onHide, onGoToBeginner }: { 
  visible: boolean; 
  difficulty: Difficulty | null; 
  onHide: () => void;
  onGoToBeginner?: () => void;
}) {
  const { theme } = useAppTheme();
  
  if (!difficulty) return null;

  const content = {
    medium: {
      title: "Level Locked",
      message: "Complete Beginner level to unlock Intermediate.",
      fun: "You must master the basics before advancing your mind.",
      target: "Beginner"
    },
    hard: {
      title: "Level Locked",
      message: "Complete Intermediate level to unlock Advanced.",
      fun: "A sharp mind requires steady progression. Calm your spirit first.",
      target: "Intermediate"
    }
  }[difficulty as 'medium' | 'hard'];

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onHide} />
        
        <View style={styles.modalContentWrapper}>
          <BlurView intensity={30} tint={theme.background === '#0F172A' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          <View style={[styles.modalContent, { backgroundColor: theme.card + 'D9' }]}>
            <View style={[styles.lockCircle, { backgroundColor: theme.accent + '20' }]}>
              <Lock size={32} color={theme.accent} strokeWidth={1.5} />
            </View>
            
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{content?.title}</Text>
            <Text style={[styles.modalMessage, { color: theme.textSecondary }]}>{content?.message}</Text>
            <Text style={[styles.modalFun, { color: theme.accent }]}>{content?.fun}</Text>
            
            <Pressable
              onPress={onHide}
              style={({ pressed }) => [
                styles.modalBtn,
                { backgroundColor: theme.accent },
                pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
              ]}
            >
              <View style={styles.btnGlow} />
              <Text style={styles.modalBtnText}>OK</Text>
            </Pressable>

            {onGoToBeginner && (
              <Pressable
                onPress={onGoToBeginner}
                style={({ pressed }) => [
                  styles.modalSubBtn,
                  pressed && { opacity: 0.6 }
                ]}
              >
                <Text style={[styles.modalSubBtnText, { color: theme.textSecondary }]}>
                  Try {content?.target}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Hero card (Today's Puzzle) ────────────────────────────────────────────────

function HeroCard({ onPlay }: { onPlay: () => void }) {
  const { theme } = useAppTheme();
  return (
    <View 
      style={styles.heroCardContainer}
      renderToHardwareTextureAndroid={true}
      shouldRasterizeIOS={true}
    >
      {/* Background Glow Layer */}
      <LinearGradient
        colors={[theme.accent + '40', 'transparent']}
        style={styles.heroGlow}
      />
      
      <View style={[styles.heroCard, { backgroundColor: theme.card, borderColor: theme.accent + '20' }]}>
        {/* Icon circle */}
        <View style={[styles.heroIconCircle, { backgroundColor: theme.accent + '20' }]}>
          <Brain size={32} color={theme.accent} strokeWidth={1.5} />
        </View>

        <Text style={[styles.heroTitle, { color: theme.textPrimary }]}>Today{"'"}s Puzzle</Text>
        <Text style={[styles.heroSubtitle, { color: theme.textSecondary }]}>
          Train your brain daily with a curated zen experience.
        </Text>

        {/* Play Now button with Glow */}
        <View 
          style={styles.heroButtonGlowContainer}
          renderToHardwareTextureAndroid={true}
          shouldRasterizeIOS={true}
        >
          <Pressable
            onPress={onPlay}
            style={({ pressed }) => [
              styles.heroButtonWrapper,
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
          >
            <LinearGradient
              colors={['#d0bcff', theme.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.heroButton}
            >
              <Text style={styles.heroButtonText}>Play Now</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </View>
  );
}


// ─── Home Screen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const { startNewGame, loadGame, stats } = useGame();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();

  // Selected difficulty pill (defaults to easy if medium is locked)
  const initialDifficulty: Difficulty = stats.difficultyStats.easy.won > 0 ? 'medium' : 'easy';
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>(initialDifficulty);
  
  // Locked Level State
  const [lockedTarget, setLockedTarget] = useState<Difficulty | null>(null);

  // ── handlers (all original logic, untouched) ──
  const handlePlayDaily = useCallback(() => {
    const dailyPuzzle = generatePuzzleFromDate(new Date(), 'medium');
    loadGame(dailyPuzzle);
    router.push('../game');
  }, [loadGame, router]);

  const handleSelectDifficulty = useCallback((d: Difficulty) => {
    setSelectedDifficulty(d);
    startNewGame(d);
    router.push({ pathname: '../game', params: { difficulty: d } });
  }, [startNewGame, router]);

  const handleLockedPress = useCallback((d: Difficulty) => {
    setLockedTarget(d);
  }, []);

  const handleViewStats = useCallback(() => {
    router.push('../stats');
  }, [router]);

  const paddingTop = Platform.OS === 'web' ? 24 : insets.top + 8;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {/* Background ambient orbs */}
      <View style={[styles.orbTopLeft, { backgroundColor: theme.accent + '15' }]} />
      <View style={[styles.orbBottomRight, { backgroundColor: theme.accent + '10' }]} />
      <View style={styles.ambientGlow} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.accent }]}>SudoZen</Text>
          <Text style={[styles.headerTagline, { color: theme.textSecondary }]}>MINDFUL LOGIC</Text>
        </View>

        {/* ── Hero Card ── */}
        <HeroCard onPlay={handlePlayDaily} />

        {/* ── Choose Difficulty ── */}
        <Text style={styles.sectionLabel}>CHOOSE DIFFICULTY</Text>
        <DifficultyPills
          active={selectedDifficulty}
          onSelect={handleSelectDifficulty}
          onLockedPress={handleLockedPress}
          stats={stats}
        />

        <LockedLevelPopup
          visible={!!lockedTarget}
          difficulty={lockedTarget}
          onHide={() => setLockedTarget(null)}
          onGoToBeginner={() => {
            setLockedTarget(null);
            handleSelectDifficulty('easy');
          }}
        />

        {/* ── Streak Tracker (full animated milestone card) ── */}
        {/* streakDays is driven by real puzzle completions via game-context */}
        <StreakTracker streakDays={stats.winStreak} />

        {/* ── Games played mini-card ── */}
        <View style={styles.gamesCard}>
          <View style={styles.gamesIconCircle}>
            <Grid3X3 size={24} color={theme.accent} strokeWidth={1.5} />
          </View>
          <View>
            <Text style={styles.gamesLabel}>GAMES PLAYED</Text>
            <Text style={[styles.gamesValue, { color: theme.textPrimary }]}>{stats.gamesPlayed}</Text>
          </View>
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
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.statsLinkText, { color: theme.accent }]}>View Full Statistics</Text>
            <ChevronRight size={16} color={theme.accent} style={{ marginLeft: 4 }} />
          </View>
        </Pressable>

        {/* bottom breathing room */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
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
    letterSpacing: -0.3,
  },
  headerTagline: {
    fontSize: 10,
    fontWeight: '300',
    letterSpacing: 5,
    marginTop: 2,
  },

  // ── Hero card ──
  heroCardContainer: {
    position: 'relative',
    marginBottom: 28,
  },
  heroGlow: {
    position: 'absolute',
    top: -12,
    left: -12,
    right: -12,
    bottom: -12,
    borderRadius: 36,
    opacity: 0.2,
  },
  heroCard: {
    backgroundColor: '#F5F0FF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(105,69,199,0.12)',
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
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    fontWeight: '300',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  heroButtonGlowContainer: {
    width: '100%',
    shadowColor: '#a078ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
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
    justifyContent: 'space-between',
    width: '100%',
    gap: 10,
    marginBottom: 28,
  },
  pill: {
    flex: 1,
    minHeight: 46,
    borderRadius: 999,
    overflow: 'hidden',
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  pillActive: {},
  pillInactive: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  pillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 14,
  },
  pillGradient: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  pillActiveText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  pillInactiveText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },

  // ── Games mini-card ──
  gamesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 20,
    padding: 16,
    marginTop: 12,
    marginBottom: 20,
    backgroundColor: 'rgba(156,122,254,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(105,69,199,0.12)',
  },
  gamesIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(156,122,254,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gamesIcon: { fontSize: 20 },
  gamesLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#9ca3af',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  gamesValue: {
    fontSize: 18,
    fontWeight: '800',
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
    letterSpacing: 0.2,
  },

  // ── Modal Styles ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContentWrapper: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  modalContent: {
    padding: 32,
    alignItems: 'center',
  },
  lockCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 12,
  },
  modalFun: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 28,
    fontWeight: '600',
    opacity: 0.8,
  },
  modalBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  btnGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    opacity: 0.15,
    borderRadius: 16,
  },
  modalBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  modalSubBtn: {
    paddingVertical: 8,
  },
  modalSubBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  ambientGlow: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#d0bcff',
    opacity: 0.08,
  },
});
