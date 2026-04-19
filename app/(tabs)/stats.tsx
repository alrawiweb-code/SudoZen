import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { ScrollView, Text, View, Pressable, StyleSheet, Platform, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { useGame } from '@/lib/game-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { generatePuzzleFromDate } from '@/services/puzzleService';
import { useAppTheme } from '@/lib/theme-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StreakTracker, MILESTONES } from '@/components/streak-tracker';

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getMonthName(date: Date) {
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
}

import { toLocalDateString as toIsoDate } from '@/lib/utils';


function formatBestTime(ms: string | null) {
  if (!ms) return '--:--';
  const totalSeconds = Math.floor(parseInt(ms, 10) / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function formatTotalTime(ms: number) {
  if (!ms) return '0h 0m';
  const totalMins = Math.floor(ms / 60000);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ─── Streak-based color helper ─────────────────────────────────────────────────
function getStreakColor(streak: number): { fill: string; dark: string } {
  if (streak >= 7)  return { fill: '#c084fc', dark: '#7e22ce' }; // purple
  if (streak >= 5)  return { fill: '#fb923c', dark: '#c2410c' }; // orange
  if (streak >= 3)  return { fill: '#fde68a', dark: '#d97706' }; // yellow
  return { fill: '#a78bfa', dark: '#6d28d9' };                    // soft purple glass
}

// ─── Single animated day cell ──────────────────────────────────────────────────
function DayCell({
  day, isPlayed, isToday, isFuture,
  streakColor, hasLeft, hasRight, idx, theme, isDark,
}: {
  day: number;
  isPlayed: boolean;
  isToday: boolean;
  isFuture: boolean;
  streakColor: { fill: string; dark: string };
  hasLeft: boolean;   // consecutive played day to the left
  hasRight: boolean;  // consecutive played day to the right
  idx: number;        // grid position for stagger
  theme: any;
  isDark: boolean;
}) {
  // ── Staggered entrance fade-in ─────────────────────────────────────────────
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(6)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1, duration: 250, delay: idx * 18,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0, duration: 250, delay: idx * 18,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // ── Pop animation on played ────────────────────────────────────────────────
  const scale = useRef(new Animated.Value(0.8)).current;
  useEffect(() => {
    if (isPlayed) {
      scale.setValue(0.8);
      Animated.spring(scale, {
        toValue: 1, friction: 5, tension: 120, useNativeDriver: true,
      }).start();
    } else {
      scale.setValue(1);
    }
  }, [isPlayed]);

  // ── Pulse glow for today (looping) ────────────────────────────────────────
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!isToday) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1.0,  duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, [isToday]);

  // ── Tooltip on tap ─────────────────────────────────────────────────────────
  const [showTip, setShowTip] = useState(false);
  const tipAnim = useRef(new Animated.Value(0)).current;
  const handleTap = useCallback(() => {
    setShowTip(true);
    tipAnim.setValue(0);
    Animated.sequence([
      Animated.timing(tipAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(1000),
      Animated.timing(tipAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => setShowTip(false));
  }, []);

  const tipLabel = isToday ? 'Today' : isPlayed ? 'Completed ✓' : isFuture ? 'Future' : 'Missed';

  // ── Resolved styles ────────────────────────────────────────────────────────
  const missedBg = isDark ? '#1e293b' : '#F3F4F6';
  const futureBg = isDark ? 'rgba(30,41,59,0.5)' : 'rgba(237,238,241,0.5)';

  const cellBg = isPlayed
    ? streakColor.fill
    : isToday
    ? theme.accent + '22'
    : isFuture ? futureBg : missedBg;

  const textColor = isPlayed
    ? '#fff'
    : isToday
    ? theme.accent
    : isFuture ? (isDark ? 'rgba(148,163,184,0.3)' : 'rgba(148,163,184,0.4)')
    : theme.textSecondary;

  const fontWeight = isToday ? '900' : isPlayed ? '700' : '500';

  return (
    <Pressable onPress={handleTap} style={cs.cellWrapper}>
      {/* Chain connector — left side */}
      {hasLeft && (
        <View
          style={[
            cs.chainLeft,
            { backgroundColor: streakColor.fill + 'aa' },
          ]}
        />
      )}
      {/* Chain connector — right side */}
      {hasRight && (
        <View
          style={[
            cs.chainRight,
            { backgroundColor: streakColor.fill + 'aa' },
          ]}
        />
      )}

      <Animated.View
        style={[
          cs.cell,
          { backgroundColor: cellBg },
          isPlayed && {
            shadowColor: streakColor.fill,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.45,
            shadowRadius: 6,
            elevation: 4,
          },
          isToday && !isPlayed && {
            borderWidth: 2,
            borderColor: theme.accent,
          },
          { opacity, transform: [{ translateY }, { scale: isToday ? pulse : scale }] } as any,
        ]}
      >
        <Text style={[
          cs.cellText,
          { color: textColor, fontWeight },
        ]}>
          {day}
        </Text>

        {/* Tiny sparkle for today + played */}
        {isToday && isPlayed && (
          <Text style={cs.sparkle}>✨</Text>
        )}
      </Animated.View>

      {/* Tooltip */}
      {showTip && (
        <Animated.View
          style={[
            cs.tooltip,
            { opacity: tipAnim, transform: [{ translateY: tipAnim.interpolate({ inputRange: [0,1], outputRange: [4,0] }) }] },
          ]}
        >
          <Text style={cs.tooltipText}>{tipLabel}</Text>
        </Animated.View>
      )}
    </Pressable>
  );
}

// ─── Activity Calendar Component ───────────────────────────────────────────────
function ActivityCalendar({ playedDates, winStreak }: { playedDates: string[], winStreak: number }) {
  const { theme, isDark } = useAppTheme();
  
  const datesSet = useMemo(() => {
    const set = new Set(playedDates);
    // Simulate streak if history unavailable
    if (set.size === 0 && winStreak > 0) {
      const d = new Date();
      for (let i = 0; i < winStreak; i++) {
        set.add(toIsoDate(new Date(d)));
        d.setDate(d.getDate() - 1);
      }
    }
    return set;
  }, [playedDates, winStreak]);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const todayIso = toIsoDate(now);

  // ── Month progress ─────────────────────────────────────────────────────────
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const playedThisMonth = [...datesSet].filter(d => d.startsWith(todayIso.substring(0, 7))).length;
  const completionPct = Math.round((playedThisMonth / dayOfMonth) * 100);
  const streakColor = getStreakColor(winStreak);

  // ── Calendar grid layout ───────────────────────────────────────────────────
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sunday
  // Mon=0 … Sun=6
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  // Build ISO date list for the month so we can check neighbours
  const monthDates = Array.from({ length: daysInMonth }, (_, i) => {
    return toIsoDate(new Date(year, month, i + 1));
  });

  const emptyPads = Array.from({ length: startOffset });
  let gridIdx = 0;

  return (
    <View style={[cs.card, { backgroundColor: theme.card, borderColor: theme.accent + '20' }]}>
      {/* Header */}
      <View style={cs.header}>
        <Text style={[cs.title, { color: theme.textPrimary }]}>Activity</Text>
        <Text style={[cs.month, { color: theme.accent }]}>{getMonthName(now)}</Text>
      </View>

      {/* Month progress bar */}
      <View style={cs.progressSection}>
        <View style={cs.progressMeta}>
          <Text style={[cs.progressLabel, { color: theme.textSecondary }]}>
            🔥 {playedThisMonth} day{playedThisMonth !== 1 ? 's' : ''} played this month
          </Text>
          <Text style={[cs.progressPct, { color: streakColor.dark }]}>{completionPct}%</Text>
        </View>
        <View style={[cs.progressTrack, { backgroundColor: isDark ? '#334155' : '#e2e8f0' }]}>
          <Animated.View
            style={[
              cs.progressFill,
              { width: `${completionPct}%` as any, backgroundColor: streakColor.fill },
            ]}
          />
        </View>
      </View>

      {/* Weekday headers */}
      <View style={cs.grid}>
        {['M','T','W','T','F','S','S'].map((d, i) => (
          <Text key={i} style={[cs.dayHeader, { color: theme.textSecondary + '88' }]}>{d}</Text>
        ))}

        {/* Empty pads */}
        {emptyPads.map((_, i) => {
          gridIdx++;
          return <View key={`e-${i}`} style={cs.cellWrapper} />;
        })}

        {/* Day cells */}
        {monthDates.map((isoDate, i) => {
          const d = i + 1;
          const isToday = isoDate === todayIso;
          const isPlayed = datesSet.has(isoDate);
          const isFuture = new Date(year, month, d) > now;

          // Consecutive chain check
          const prevIso = i > 0 ? monthDates[i - 1] : null;
          const nextIso = i < monthDates.length - 1 ? monthDates[i + 1] : null;
          const hasLeft  = isPlayed && !!prevIso && datesSet.has(prevIso);
          const hasRight = isPlayed && !!nextIso && datesSet.has(nextIso);

          const gi = gridIdx++;
          return (
            <DayCell
              key={isoDate}
              day={d}
              isPlayed={isPlayed}
              isToday={isToday}
              isFuture={isFuture}
              streakColor={streakColor}
              hasLeft={hasLeft}
              hasRight={hasRight}
              idx={gi}
              theme={theme}
              isDark={isDark}
            />
          );
        })}
      </View>
    </View>
  );
}

// ─── Animated count-up number ─────────────────────────────────────────────────
// Smoothly counts from 0 → target over `duration` ms using requestAnimationFrame.
function AnimatedStatValue({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) return;
    const dur = 700;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - t, 3); // cubic ease-out
      setDisplay(Math.round(value * eased));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value]);
  return <Text>{display}{suffix}</Text>;
}

// ─── Animated gradient progress bar ──────────────────────────────────────────
// Fills from 0 → percent with an optional shimmer overlay.
function AnimatedBar({
  percent, gradientColors, delay = 0, isDark,
}: {
  percent: number;
  gradientColors: [string, string];
  delay?: number;
  isDark: boolean;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fill animation
    Animated.timing(anim, {
      toValue: percent, duration: 750, delay,
      easing: Easing.out(Easing.cubic), useNativeDriver: false,
    }).start();
    // Looping shimmer sweep
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1200, delay: delay + 400, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.delay(2500),
      ])
    ).start();
  }, [percent]);

  const width = anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
  const shimX = shimmer.interpolate({ inputRange: [0, 1], outputRange: ['-100%', '200%'] });

  return (
    <View style={[
      ps.barTrack,
      { backgroundColor: isDark ? '#334155' : '#e2e8f0' },
    ]}>
      <Animated.View style={[ps.barFill, { width }]}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Shimmer sweep */}
        <Animated.View
          style={[
            ps.shimmer,
            { transform: [{ translateX: shimX as any }] },
          ]}
        />
      </Animated.View>
    </View>
  );
}

// ─── Sub-components (upgraded) ───────────────────────────────────────────────

function MonthlyStatCard({
  icon, label, numericValue, displayValue, bg, accentColor, theme, delay = 0,
}: {
  icon: string; label: string;
  numericValue: number;  // for count-up animation
  displayValue: string;  // raw formatted string (used when not a plain number)
  bg: string; accentColor: string;
  theme: any; delay?: number;
}) {
  // Card entrance — fade + slide up
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1, duration: 400, delay,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0, duration: 400, delay,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true })  .start();
  const handlePressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }).start();

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }, { scale: scaleAnim }] }]}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.statCard, {
          backgroundColor: theme.card,
          borderColor: accentColor + '25',
          shadowColor: accentColor,
          shadowOpacity: 0.12,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 3,
        }]}
      >
        <View style={styles.statCardInner}>
          <View style={[styles.statCardIconCircle, { backgroundColor: bg }]}>
            <Text style={[styles.statCardIcon, { color: accentColor }]}>{icon}</Text>
          </View>
          <View>
            <Text style={[styles.statCardLabel, { color: theme.textSecondary }]}>{label}</Text>
            <Text style={[styles.statCardValue, { color: theme.textPrimary }]}>
              {displayValue}
            </Text>
          </View>
        </View>
        <Text style={[styles.statCardChevron, { color: accentColor + '60' }]}>›</Text>
      </Pressable>
    </Animated.View>
  );
}

const RECORD_BADGES: Record<string, { icon: string; gradient: [string, string] }> = {
  Beginner:     { icon: '🌱', gradient: ['#34D399', '#10B981'] },
  Intermediate: { icon: '⚡', gradient: ['#FBBF24', '#F59E0B'] },
  Advanced:     { icon: '🔥', gradient: ['#F87171', '#EF4444'] },
};

function RecordRow({
  label, time, theme, delay = 0, isDark,
}: {
  label: string; time: string; theme: any; delay?: number; isDark: boolean;
}) {
  const badge = RECORD_BADGES[label];
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(-12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 380, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 0, duration: 380, delay, easing: Easing.out(Easing.back(1.3)), useNativeDriver: true }),
    ]).start();
  }, []);

  const isPersonalBest = time !== '--:--';

  return (
    <Animated.View style={[styles.recordRow, { opacity, transform: [{ translateX }] }]}>
      <View style={styles.recordRowLeft}>
        {badge && (
          <View style={[styles.recordBadge, { backgroundColor: badge.gradient[0] + '25' }]}>
            <Text style={styles.recordBadgeIcon}>{badge.icon}</Text>
          </View>
        )}
        <Text style={[styles.recordLabel, { color: theme.textSecondary }]}>{label}</Text>
      </View>
      <View style={[styles.recordTimeChip,
        isPersonalBest && { backgroundColor: theme.accent + '18', borderColor: theme.accent + '40', borderWidth: 1 }
      ]}>
        <Text style={[styles.recordTime, { color: isPersonalBest ? theme.accent : theme.textSecondary }]}>
          {time}
        </Text>
      </View>
    </Animated.View>
  );
}

function ProgressRow({
  label, percent, gradientColors, theme, delay = 0, isDark,
}: {
  label: string; percent: number;
  gradientColors: [string, string];
  theme: any; delay?: number; isDark: boolean;
}) {
  // Animated percentage counter
  const [displayPct, setDisplayPct] = useState(0);
  useEffect(() => {
    if (percent === 0) return;
    const dur = 750;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayPct(Math.round(percent * eased));
      if (t < 1) requestAnimationFrame(step);
    };
    setTimeout(() => requestAnimationFrame(step), delay);
  }, [percent]);

  return (
    <View style={styles.progressRow}>
      <View style={styles.progressHeader}>
        <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>{label}</Text>
        <Text style={[styles.progressPercent, {
          color: gradientColors[0],
          fontWeight: '800',
        }]}>{displayPct}%</Text>
      </View>
      <AnimatedBar
        percent={percent}
        gradientColors={gradientColors}
        delay={delay}
        isDark={isDark}
      />
    </View>
  );
}

// ─── Daily Consistency Card ───────────────────────────────────────────────────
function DailyConsistencyCard({
  winStreak, gamesPlayed, theme, isDark,
}: {
  winStreak: number; gamesPlayed: number; theme: any; isDark: boolean;
}) {
  const streakCol = getStreakColor(winStreak);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 500, delay: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 500, delay: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  // Pulsing streak number
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (winStreak === 0) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1.0, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, [winStreak]);

  const consistencyPct = gamesPlayed > 0
    ? Math.min(Math.round((winStreak / gamesPlayed) * 100), 100)
    : 0;

  return (
    <Animated.View
      style={[
        ps.consistencyCard,
        {
          backgroundColor: theme.card,
          borderColor: streakCol.fill + '40',
          shadowColor: streakCol.fill,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={ps.consistencyHeader}>
        <Text style={[ps.consistencyTitle, { color: theme.textPrimary }]}>Daily Consistency</Text>
        <View style={[ps.consistencyBadge, { backgroundColor: streakCol.fill + '25' }]}>
          <Text style={[ps.consistencyBadgeText, { color: streakCol.dark }]}>🔥 Active</Text>
        </View>
      </View>

      <View style={ps.consistencyRow}>
        {/* Current streak big number */}
        <Animated.View style={[
          ps.streakBlock,
          { backgroundColor: streakCol.fill + '18', transform: [{ scale: pulse }] },
        ]}>
          <Text style={[ps.streakBigNumber, { color: streakCol.dark }]}>{winStreak}</Text>
          <Text style={[ps.streakBlockLabel, { color: streakCol.dark + 'cc' }]}>current{"\n"}streak</Text>
        </Animated.View>

        {/* Consistency % bar */}
        <View style={ps.consistencyBarCol}>
          <Text style={[ps.consistencyBarLabel, { color: theme.textSecondary }]}>
            Streak vs total games
          </Text>
          <AnimatedBar
            percent={consistencyPct}
            gradientColors={[streakCol.fill, streakCol.dark]}
            delay={300}
            isDark={isDark}
          />
          <Text style={[ps.consistencyPct, { color: streakCol.dark }]}>{consistencyPct}%</Text>
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function StatsScreen() {
  const router = useRouter();
  const { stats, loadGame } = useGame();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();

  const [bestTimes, setBestTimes] = useState({
    easy: null as string | null,
    medium: null as string | null,
    hard: null as string | null,
  });

  useEffect(() => {
    const fetchBestTimes = async () => {
      try {
        const easy = await AsyncStorage.getItem('bestTime_easy');
        const medium = await AsyncStorage.getItem('bestTime_medium');
        const hard = await AsyncStorage.getItem('bestTime_hard');
        setBestTimes({ easy, medium, hard });
      } catch (e) {}
    };
    fetchBestTimes();
  }, []);

  const paddingTop = Platform.OS === 'web' ? 24 : insets.top + 8;
  const todayIso = toIsoDate(new Date());
  const playedToday = (stats.playedDates || []).includes(todayIso);

  // ── Computed stats (unchanged) ────────────────────────────────────────────────
  const currentMonthPrefix = todayIso.substring(0, 7);
  const monthGamesPlayed = (stats.playedDates || []).filter(d => d.startsWith(currentMonthPrefix)).length;
  const totalPlayTimeFormatted = formatTotalTime(stats.totalTime);

  const getPercent = (played: number) => {
    if (stats.gamesPlayed === 0) return 0;
    return (played / stats.gamesPlayed) * 100;
  };

  const handlePlayToday = () => {
    const dailyPuzzle = generatePuzzleFromDate(new Date(), 'medium');
    loadGame(dailyPuzzle);
    router.push('/game');
  };

  // ── Header entrance animation ───────────────────────────────────────────────
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerY = useRef(new Animated.Value(-10)).current;
  const iconPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Slide-down fade-in for header
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(headerY, { toValue: 0, friction: 7, tension: 60, useNativeDriver: true }),
    ]).start();
    // Floating pulse on the icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(iconPulse, { toValue: 1.12, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(iconPulse, { toValue: 1.0, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: theme.background, paddingTop }]}>
      {/* ── Animated Header ── */}
      <Animated.View
        style={[
          styles.header,
          { backgroundColor: theme.background, opacity: headerOpacity, transform: [{ translateY: headerY }] },
        ]}
      >
        <View style={styles.headerLeft}>
          {/* Floating pulsing icon */}
          <Animated.View
            style={[
              styles.headerIconCircle,
              { backgroundColor: theme.accent + '20', transform: [{ scale: iconPulse }] },
            ]}
          >
            <Text style={styles.headerIcon}>🧘</Text>
          </Animated.View>
          <View>
            <Text style={[styles.headerTitle, { color: theme.accent }]}>Your Progress</Text>
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Stay consistent, stay sharp</Text>
          </View>
        </View>
      </Animated.View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Streak Tracker ── */}
        <View style={styles.streakWrapper}>
          <StreakTracker streakDays={stats.winStreak} />
        </View>

        {/* ── Gamified Activity Calendar ── */}
        <ActivityCalendar playedDates={stats.playedDates || []} winStreak={stats.winStreak} />

        {/* ── Daily Consistency Card (connects streak ↔ stats) ── */}
        <DailyConsistencyCard
          winStreak={stats.winStreak}
          gamesPlayed={stats.gamesPlayed}
          theme={theme}
          isDark={isDark}
        />

        {/* ── Best Records (animated reveal) ── */}
        <View style={[styles.recordsCard, {
          backgroundColor: theme.card,
          borderColor: theme.accent + '20',
          borderWidth: 1,
          shadowColor: theme.accent,
          shadowOpacity: 0.06,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 4 },
          elevation: 2,
        }]}>
          <Text style={[styles.recordsTitle, { color: theme.textPrimary }]}>Best Records</Text>
          <View style={styles.recordsList}>
            <RecordRow label="Beginner"     time={formatBestTime(bestTimes.easy)}   theme={theme} delay={0}   isDark={isDark} />
            <RecordRow label="Intermediate" time={formatBestTime(bestTimes.medium)} theme={theme} delay={80}  isDark={isDark} />
            <RecordRow label="Advanced"     time={formatBestTime(bestTimes.hard)}   theme={theme} delay={160} isDark={isDark} />
          </View>
        </View>

        {/* ── Monthly Stats cards (animated) ── */}
        <View style={styles.statsGrid}>
          <MonthlyStatCard icon="⊞" label="Games this month"  numericValue={monthGamesPlayed} displayValue={String(monthGamesPlayed)} bg={theme.accent + '30'} accentColor={theme.accent} theme={theme} delay={0}   />
          <MonthlyStatCard icon="📈" label="Best streak"        numericValue={stats.winStreak}   displayValue={`${stats.winStreak} days`} bg={theme.accent + '30'} accentColor={theme.accent} theme={theme} delay={60}  />
          <MonthlyStatCard icon="⏱️" label="Total games"       numericValue={stats.gamesPlayed} displayValue={String(stats.gamesPlayed)}  bg={theme.accent + '20'} accentColor={theme.accent} theme={theme} delay={120} />
          <MonthlyStatCard icon="⌛" label="Total play time"   numericValue={0}                 displayValue={totalPlayTimeFormatted}     bg={theme.accent + '20'} accentColor={theme.accent} theme={theme} delay={180} />
        </View>

        {/* ── Experience Progress (animated gradient bars) ── */}
        <View style={[styles.progressCard, {
          backgroundColor: theme.card,
          borderColor: theme.accent + '20', borderWidth: 1,
          shadowColor: theme.accent, shadowOpacity: 0.06, shadowRadius: 14,
          shadowOffset: { width: 0, height: 4 }, elevation: 2,
        }]}>
          <Text style={[styles.progressTitle, { color: theme.textPrimary }]}>Experience Progress</Text>
          <View style={styles.progressList}>
            <ProgressRow label="Beginner"     percent={getPercent(stats.difficultyStats.easy.played)}   gradientColors={['#34D399', '#059669']} theme={theme} delay={0}   isDark={isDark} />
            <ProgressRow label="Intermediate" percent={getPercent(stats.difficultyStats.medium.played)} gradientColors={['#FBBF24', '#D97706']} theme={theme} delay={120} isDark={isDark} />
            <ProgressRow label="Advanced"     percent={getPercent(stats.difficultyStats.hard.played)}   gradientColors={['#F87171', '#DC2626']} theme={theme} delay={240} isDark={isDark} />
          </View>
        </View>

        {/* ── CTA Button ── */}
        <View style={styles.ctaWrapper}>
          <Pressable
            onPress={handlePlayToday}
            style={({ pressed }) => [
              styles.ctaButtonWrapper,
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }
            ]}
          >
            <LinearGradient
              colors={[theme.accent, theme.accent + 'cc']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
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

// ─── Calendar StyleSheet (gamified) ──────────────────────────────────────────

const CELL_SIZE = '12%' as const;

const cs = StyleSheet.create({
  // Card wrapper
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    marginBottom: 24,
    overflow: 'visible',
  },
  // Header row
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  month: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  // Month progress
  progressSection: {
    marginBottom: 18,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressPct: {
    fontSize: 12,
    fontWeight: '800',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'space-between',
  },
  dayHeader: {
    width: CELL_SIZE,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 4,
  },
  // Cell wrapper — position:relative so connectors & tooltip can overlay
  cellWrapper: {
    width: CELL_SIZE,
    aspectRatio: 1,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // The visible rounded square
  cell: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cellText: {
    fontSize: 12,
  },
  // Sparkle emoji for today+played
  sparkle: {
    position: 'absolute',
    top: -6,
    right: -4,
    fontSize: 9,
  },
  // Chain connector strips — horizontal bars behind consecutive cells
  chainLeft: {
    position: 'absolute',
    left: 0,
    top: '25%',
    width: '50%',
    height: '50%',
    zIndex: 0,
  },
  chainRight: {
    position: 'absolute',
    right: 0,
    top: '25%',
    width: '50%',
    height: '50%',
    zIndex: 0,
  },
  // Tooltip
  tooltip: {
    position: 'absolute',
    top: -28,
    left: '50%',
    transform: [{ translateX: -28 }],
    backgroundColor: 'rgba(15,23,42,0.88)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    zIndex: 99,
    minWidth: 56,
    alignItems: 'center',
  },
  tooltipText: {
    color: '#f1f5f9',
    fontSize: 10,
    fontWeight: '600',
  },
});

// ─── Premium Stats StyleSheet (AnimatedBar + DailyConsistencyCard) ────────────

const ps = StyleSheet.create({
  // AnimatedBar
  barTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
    overflow: 'hidden',
    position: 'relative',
  },
  // Shimmer overlay that sweeps across the bar
  shimmer: {
    position: 'absolute',
    top: 0, bottom: 0,
    width: '40%',
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 5,
  },
  // DailyConsistencyCard
  consistencyCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    marginBottom: 24,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 4,
  },
  consistencyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  consistencyTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  consistencyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  consistencyBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  consistencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  streakBlock: {
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'center',
    minWidth: 80,
  },
  streakBigNumber: {
    fontSize: 40,
    fontWeight: '900',
    lineHeight: 44,
    letterSpacing: -1,
  },
  streakBlockLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  consistencyBarCol: {
    flex: 1,
    gap: 6,
  },
  consistencyBarLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  consistencyPct: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
});

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    fontSize: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '400',
  },

  // ── Streak Card ──
  streakWrapper: {
    marginBottom: 24,
  },

  // ── Monthly Stats Array ──
  statsGrid: {
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
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
    marginBottom: 2,
  },
  statCardValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  statCardChevron: {
    fontSize: 24,
    fontWeight: '300',
  },

  // ── Best Records ──
  recordsCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
  },
  recordsTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  recordsList: {
    gap: 12,
  },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  recordRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recordBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordBadgeIcon: {
    fontSize: 15,
  },
  recordLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  recordTimeChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  recordTime: {
    fontSize: 15,
    fontWeight: '700',
  },

  // ── Progress Visual ──
  progressCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  progressList: {
    gap: 16,
  },
  progressRow: {
    gap: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '700',
  },

  // ── CTA Button ──
  ctaWrapper: {
    paddingTop: 16,
  },
  ctaButtonWrapper: {
    width: '100%',
    borderRadius: 50,
    overflow: 'hidden',
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
