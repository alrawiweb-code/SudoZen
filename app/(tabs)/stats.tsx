import { useMemo } from 'react';
import { ScrollView, Text, View, Pressable, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useGame } from '@/lib/game-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { generatePuzzleFromDate } from '@/services/puzzleService';

// ─── Constants ─────────────────────────────────────────────────────────────────
const PRIMARY = '#6945c7';
const PRIMARY_LIGHT = '#9c7afe';
const SURFACE = '#faf9fb';
const ON_SURFACE = '#2f3336';
const ON_SURFACE_VARIANT = '#5c5f63';
const SURFACE_CARD = '#F5F0FF';
const SURFACE_LOW = '#f3f3f6';
const OUTLINE = '#e0e2e7';

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getMonthName(date: Date) {
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
}

function toIsoDate(date: Date) {
  return date.toISOString().split('T')[0];
}

// ─── Activity Calendar Component ───────────────────────────────────────────────
function ActivityCalendar({ playedDates }: { playedDates: string[] }) {
  const datesSet = useMemo(() => new Set(playedDates), [playedDates]);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const todayIso = toIsoDate(now);

  // Calculate calendar layout
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sunday
  // Convert 0=Sun, 1=Mon... to 0=Mon, 6=Sun
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const days = [];
  
  // Empty padding cells for previous month
  for (let i = 0; i < startOffset; i++) {
    days.push(<View key={`empty-${i}`} style={styles.calendarDayEmpty} />);
  }

  // Actual days of the month
  for (let d = 1; d <= daysInMonth; d++) {
    const fullDate = new Date(year, month, d);
    const isoDate = toIsoDate(fullDate);
    const isToday = isoDate === todayIso;
    const isPlayed = datesSet.has(isoDate);
    const isFuture = fullDate.getTime() > now.getTime();

    let dayStyle: any = [styles.calendarDay];
    let textStyle: any = [styles.calendarDayText];

    if (isFuture) {
      dayStyle.push(styles.calendarDayFuture);
      textStyle.push(styles.calendarDayTextFuture);
    } else if (isPlayed) {
      dayStyle.push(styles.calendarDayPlayed);
      textStyle.push(styles.calendarDayTextPlayed);
    } else if (isToday) {
      dayStyle.push(styles.calendarDayToday);
      textStyle.push(styles.calendarDayTextToday);
    } else {
      dayStyle.push(styles.calendarDayMissed);
      textStyle.push(styles.calendarDayTextMissed);
    }

    days.push(
      <View key={`day-${d}`} style={dayStyle}>
        <Text style={textStyle}>{d}</Text>
      </View>
    );
  }

  return (
    <View style={styles.calendarCard}>
      <View style={styles.calendarHeader}>
        <Text style={styles.calendarTitle}>Activity</Text>
        <Text style={styles.calendarMonthText}>{getMonthName(now)}</Text>
      </View>

      <View style={styles.calendarGrid}>
        {/* Weekday Labels (Mon - Sun) */}
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
          <Text key={`header-${idx}`} style={styles.calendarDayHeader}>
            {day}
          </Text>
        ))}

        {days}
      </View>
    </View>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

function MonthlyStatCard({ icon, label, value, bg, color }: { icon: string; label: string; value: string | number; bg: string; color: string }) {
  return (
    <Pressable style={({ pressed }) => [styles.statCard, pressed && { opacity: 0.8 }]}>
      <View style={styles.statCardInner}>
        <View style={[styles.statCardIconCircle, { backgroundColor: bg }]}>
          <Text style={[styles.statCardIcon, { color }]}>{icon}</Text>
        </View>
        <View>
          <Text style={styles.statCardLabel}>{label}</Text>
          <Text style={styles.statCardValue}>{value}</Text>
        </View>
      </View>
      <Text style={styles.statCardChevron}>›</Text>
    </Pressable>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function StatsScreen() {
  const router = useRouter();
  const { stats, loadGame } = useGame();
  const insets = useSafeAreaInsets();

  const paddingTop = Platform.OS === 'web' ? 24 : insets.top + 8;
  const todayIso = toIsoDate(new Date());
  const playedToday = (stats.playedDates || []).includes(todayIso);

  // Compute month stats
  const currentMonthPrefix = todayIso.substring(0, 7); // YYYY-MM
  const monthGamesPlayed = (stats.playedDates || []).filter(d => d.startsWith(currentMonthPrefix)).length;

  const handlePlayToday = () => {
    const dailyPuzzle = generatePuzzleFromDate(new Date(), 'medium'); // Default to medium for daily
    loadGame(dailyPuzzle);
    router.push('/game');
  };

  return (
    <View style={[styles.root, { paddingTop }]}>
      {/* Sticky Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconCircle}>
            <Text style={styles.headerIcon}>🧘</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>Your Progress</Text>
            <Text style={styles.headerSubtitle}>Stay consistent, stay sharp</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Streak Section ── */}
        <View style={styles.streakWrapper}>
          <LinearGradient
            colors={[PRIMARY, PRIMARY_LIGHT]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.streakCard}
          >
            <View style={styles.streakOrb} />
            <Text style={styles.streakEmoji}>🔥</Text>
            <Text style={styles.streakTitle}>{stats.winStreak} Day Streak</Text>
            <Text style={styles.streakSubtitle}>
              {playedToday ? 'You played today' : 'Play a game to extend your streak!'}
            </Text>
          </LinearGradient>
        </View>

        {/* ── Calendar View ── */}
        <ActivityCalendar playedDates={stats.playedDates || []} />

        {/* ── Monthly Stats ── */}
        <View style={styles.statsGrid}>
          <MonthlyStatCard
            icon="⊞"
            label="Games played this month"
            value={monthGamesPlayed}
            bg="rgba(232, 222, 248, 0.8)"
            color={PRIMARY}
          />
          <MonthlyStatCard
            icon="📈"
            label="Best streak"
            value={`${stats.winStreak} days`} // Mock using winStreak for now
            bg="rgba(252, 163, 174, 0.2)"
            color="#904954"
          />
          <MonthlyStatCard
            icon="⏱️"
            label="Total games played"
            value={stats.gamesPlayed}
            bg="rgba(156, 122, 254, 0.1)"
            color={PRIMARY_LIGHT}
          />
        </View>

        {/* ── Action Button ── */}
        <View style={styles.ctaWrapper}>
          <Pressable
            onPress={handlePlayToday}
            style={({ pressed }) => [
              styles.ctaButtonWrapper,
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }
            ]}
          >
            <LinearGradient
              colors={[PRIMARY, PRIMARY_LIGHT]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaButton}
            >
              <Text style={styles.ctaButtonIcon}>▶</Text>
              <Text style={styles.ctaButtonText}>Play Today{"'"}s Puzzle</Text>
            </LinearGradient>
          </Pressable>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SURFACE,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: SURFACE, // Use solid surface color instead of rgba
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(156,122,254,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    fontSize: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#6945c7',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: '#9ca3af',
  },

  // ── Streak Card ──
  streakWrapper: {
    marginBottom: 24,
  },
  streakCard: {
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  streakOrb: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 130,
    height: 130,
    backgroundColor: 'rgba(105,69,199,0.1)',
    borderRadius: 65,
  },
  streakEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  streakTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
  },
  streakSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },

  // ── Calendar ──
  calendarCard: {
    backgroundColor: SURFACE_LOW,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: ON_SURFACE,
  },
  calendarMonthText: {
    fontSize: 10,
    fontWeight: '700',
    color: PRIMARY,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  calendarDayHeader: {
    width: '12%',
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '800',
    color: '#9ca3af',
    marginBottom: 8,
  },
  calendarDayEmpty: {
    width: '12%',
    aspectRatio: 1,
  },
  calendarDay: {
    width: '12%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  calendarDayText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Play States
  calendarDayMissed: {
    backgroundColor: '#F3F4F6',
  },
  calendarDayTextMissed: {
    color: '#cbd5e1',
  },
  calendarDayPlayed: {
    backgroundColor: PRIMARY,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  calendarDayTextPlayed: {
    color: '#fff',
  },
  calendarDayToday: {
    backgroundColor: '#EDE9FE',
    borderWidth: 2,
    borderColor: PRIMARY,
  },
  calendarDayTextToday: {
    color: PRIMARY,
    fontWeight: '800',
  },
  calendarDayFuture: {
    backgroundColor: 'rgba(237,238,241,0.5)',
  },
  calendarDayTextFuture: {
    color: 'rgba(148,163,184,0.4)',
  },

  // ── Monthly Stats Array ──
  statsGrid: {
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F0FF',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(105,69,199,0.1)',
    shadowColor: ON_SURFACE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 1,
  },
  statCardInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statCardIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCardIcon: {
    fontSize: 20,
  },
  statCardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: ON_SURFACE_VARIANT,
    marginBottom: 2,
  },
  statCardValue: {
    fontSize: 20,
    fontWeight: '800',
    color: ON_SURFACE,
  },
  statCardChevron: {
    fontSize: 24,
    color: OUTLINE,
    fontWeight: '300',
  },

  // ── CTA Button ──
  ctaWrapper: {
    paddingTop: 16,
  },
  ctaButtonWrapper: {
    width: '100%',
    borderRadius: 50,
    overflow: 'hidden',
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaButton: {
    flexDirection: 'row',
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaButtonIcon: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
