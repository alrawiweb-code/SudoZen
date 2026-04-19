/**
 * StreakTracker — Full-fidelity React Native port of the animated milestone streak system.
 *
 * Animations implemented:
 *  • creatureFloat  — sinusoidal translateY loop
 *  • creatureBounce — spring-back scale on addDay
 *  • eyeBlink       — periodic ry-collapse on eye ellipses
 *  • particleBurst  — translateXY + fade on milestone unlock
 *  • nextPulse      — looping scale on the "next" road node
 *  • counter wiggle — translateX oscillation on addDay
 *  • progress bar   — animated width via Animated.Value interpolation
 *
 * Streak driven by `streakDays` prop from game-context (real puzzle completions).
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { useAppTheme } from '@/lib/theme-context';
import Svg, {
  Ellipse,
  Circle,
  Polygon,
  Path,
} from 'react-native-svg';

// ─── MILESTONE PRESETS ────────────────────────────────────────────────────────
export const MILESTONES = [
  {
    days: 0,
    label: 'Getting Started',
    emoji: '🌱',
    creature: 'Sprout',
    color: '#a78bfa',
    dark: '#6d28d9',
    bg1: 'rgba(255,255,255,0.25)',
    bg2: 'rgba(255,255,255,0.10)',
    bodyColor: '#8b5cf6',
    eyeColor: '#4c1d95',
    cheekColor: '#c4b5fd',
    description: 'Plant your first seed!',
    particles: ['🌿', '✨', '🍃'],
  },
  {
    days: 3,
    label: '3-Day Spark',
    emoji: '⚡',
    creature: 'Spark Pup',
    color: '#fde68a',
    dark: '#d97706',
    bg1: '#fffbeb',
    bg2: '#fef3c7',
    bodyColor: '#fbbf24',
    eyeColor: '#78350f',
    cheekColor: '#fde68a',
    description: 'The habit is sparking!',
    particles: ['⚡', '✨', '💫'],
  },
  {
    days: 5,
    label: '5-Day Flame',
    emoji: '🔥',
    creature: 'Fire Fox',
    color: '#fb923c',
    dark: '#c2410c',
    bg1: '#fff7ed',
    bg2: '#ffedd5',
    bodyColor: '#f97316',
    eyeColor: '#431407',
    cheekColor: '#fed7aa',
    description: "You're on fire!",
    particles: ['🔥', '✨', '💥'],
  },
  {
    days: 7,
    label: '1-Week Beast',
    emoji: '🦁',
    creature: 'Week Lion',
    color: '#c084fc',
    dark: '#7e22ce',
    bg1: '#faf5ff',
    bg2: '#f3e8ff',
    bodyColor: '#a855f7',
    eyeColor: '#3b0764',
    cheekColor: '#e9d5ff',
    description: 'A whole week — ROAR!',
    particles: ['👑', '⭐', '✨'],
  },
  {
    days: 14,
    label: '2-Week Dragon',
    emoji: '🐉',
    creature: 'Blaze Dragon',
    color: '#f87171',
    dark: '#b91c1c',
    bg1: '#fff1f2',
    bg2: '#ffe4e6',
    bodyColor: '#ef4444',
    eyeColor: '#450a0a',
    cheekColor: '#fecaca',
    description: 'Two weeks of fire breath!',
    particles: ['🐉', '🔥', '💎'],
  },
  {
    days: 30,
    label: '1-Month Legend',
    emoji: '🌟',
    creature: 'Star Phoenix',
    color: '#67e8f9',
    dark: '#0e7490',
    bg1: '#ecfeff',
    bg2: '#cffafe',
    bodyColor: '#22d3ee',
    eyeColor: '#083344',
    cheekColor: '#a5f3fc',
    description: 'A whole month — LEGENDARY!',
    particles: ['🌟', '✨', '🌈'],
  },
  {
    days: 60,
    label: '2-Month Titan',
    emoji: '🏆',
    creature: 'Gold Titan',
    color: '#fbbf24',
    dark: '#92400e',
    bg1: '#fffbeb',
    bg2: '#fef9c3',
    bodyColor: '#f59e0b',
    eyeColor: '#451a03',
    cheekColor: '#fde68a',
    description: "Two months — you're a titan!",
    particles: ['🏆', '👑', '💰'],
  },
  {
    days: 100,
    label: '100-Day GOD',
    emoji: '🌈',
    creature: 'Rainbow God',
    color: '#818cf8',
    dark: '#3730a3',
    bg1: '#eef2ff',
    bg2: '#e0e7ff',
    bodyColor: '#6366f1',
    eyeColor: '#1e1b4b',
    cheekColor: '#c7d2fe',
    description: 'MYTHICAL. You are unstoppable.',
    particles: ['🌈', '⚡', '🎆'],
  },
] as const;

type Milestone = (typeof MILESTONES)[number];

function getMilestone(days: number): Milestone {
  let current: Milestone = MILESTONES[0];
  for (const m of MILESTONES) {
    if (days >= m.days) current = m;
    else break;
  }
  return current;
}

function getNextMilestone(days: number): Milestone | null {
  for (const m of MILESTONES) {
    if (m.days > days) return m;
  }
  return null;
}

// ─── CARTOON CREATURE ─────────────────────────────────────────────────────────
function CartoonCreature({
  milestone,
  triggerBounce,
  textColor,
}: {
  milestone: Milestone;
  triggerBounce: boolean;
  textColor: string;
}) {
  const { bodyColor, eyeColor, cheekColor, creature } = milestone;
  const idx = MILESTONES.indexOf(milestone as any);

  // Float animation (infinite translateY sine wave)
  const floatY = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, {
          toValue: -8,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatY, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Bounce animation triggered by triggerBounce
  const bounceScale = useRef(new Animated.Value(1)).current;
  const bounceY = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!triggerBounce) return;
    Animated.parallel([
      Animated.sequence([
        Animated.timing(bounceScale, { toValue: 1.15, duration: 120, useNativeDriver: true }),
        Animated.spring(bounceScale, { toValue: 1, friction: 4, tension: 80, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(bounceY, { toValue: -12, duration: 120, useNativeDriver: true }),
        Animated.timing(bounceY, { toValue: 2, duration: 100, useNativeDriver: true }),
        Animated.spring(bounceY, { toValue: 0, friction: 5, useNativeDriver: true }),
      ]),
    ]).start();
  }, [triggerBounce]);

  // Eye blink
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    let t: ReturnType<typeof setInterval>;
    const schedule = () => {
      t = setInterval(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 150);
      }, 2800 + Math.random() * 1000);
    };
    schedule();
    return () => clearInterval(t);
  }, []);

  const maneAngles = [0, 36, 72, 108, 144, 180, 216, 252, 288, 324];

  return (
    <Animated.View
      style={{
        transform: [
          { translateY: Animated.add(floatY, bounceY) },
          { scale: bounceScale },
        ],
        alignItems: 'center',
      }}
    >
      <Svg viewBox="0 0 110 110" width={110} height={110}>
        {/* Shadow */}
        <Ellipse cx="55" cy="105" rx="28" ry="5" fill="rgba(0,0,0,0.08)" />
        {/* Body */}
        <Ellipse cx="55" cy="72" rx="26" ry="22" fill={bodyColor} />
        {/* Head */}
        <Circle cx="55" cy="50" r="28" fill={bodyColor} />

        {/* idx 0 — Sprout: leaf ears */}
        {idx === 0 && (
          <>
            <Ellipse cx="33" cy="26" rx="8" ry="13" fill="#4ade80" transform="rotate(-20, 33, 26)" />
            <Ellipse cx="77" cy="26" rx="8" ry="13" fill="#4ade80" transform="rotate(20, 77, 26)" />
          </>
        )}
        {/* idx 1 — Spark Pup: round ears */}
        {idx === 1 && (
          <>
            <Circle cx="32" cy="27" r="10" fill={bodyColor} />
            <Circle cx="78" cy="27" r="10" fill={bodyColor} />
            <Circle cx="32" cy="27" r="6" fill={cheekColor} />
            <Circle cx="78" cy="27" r="6" fill={cheekColor} />
          </>
        )}
        {/* idx 2 — Fire Fox: pointed ears */}
        {idx === 2 && (
          <>
            <Polygon points="28,35 20,12 40,28" fill={bodyColor} />
            <Polygon points="82,35 90,12 70,28" fill={bodyColor} />
            <Polygon points="28,35 22,18 37,28" fill={cheekColor} />
            <Polygon points="82,35 88,18 73,28" fill={cheekColor} />
          </>
        )}
        {/* idx 3 — Lion: fluffy mane */}
        {idx === 3 && (
          <>
            {maneAngles.map((a, i) => {
              const rad = (a * Math.PI) / 180;
              const cx = 55 + 33 * Math.cos(rad);
              const cy = 50 + 33 * Math.sin(rad);
              return (
                <Ellipse
                  key={i}
                  cx={`${cx}`}
                  cy={`${cy}`}
                  rx="10"
                  ry="8"
                  fill="#fbbf24"
                  transform={`rotate(${a}, ${cx}, ${cy})`}
                />
              );
            })}
            <Circle cx="55" cy="50" r="28" fill={bodyColor} />
          </>
        )}
        {/* idx 4 — Dragon: horns */}
        {idx === 4 && (
          <>
            <Polygon points="37,28 30,6 46,24" fill="#dc2626" />
            <Polygon points="73,28 80,6 64,24" fill="#dc2626" />
          </>
        )}
        {/* idx 5 — Phoenix: wing feathers */}
        {idx === 5 && (
          <>
            <Ellipse cx="24" cy="38" rx="14" ry="8" fill={bodyColor} transform="rotate(-40, 24, 38)" />
            <Ellipse cx="86" cy="38" rx="14" ry="8" fill={bodyColor} transform="rotate(40, 86, 38)" />
            <Ellipse cx="18" cy="48" rx="12" ry="7" fill={cheekColor} transform="rotate(-30, 18, 48)" />
            <Ellipse cx="92" cy="48" rx="12" ry="7" fill={cheekColor} transform="rotate(30, 92, 48)" />
          </>
        )}
        {/* idx >= 6 — Titan / God: crown spikes */}
        {idx >= 6 && (
          <>
            {[-24, -12, 0, 12, 24].map((x, i) => (
              <Polygon
                key={i}
                points={`${55 + x - 5},28 ${55 + x},10 ${55 + x + 5},28`}
                fill="#fbbf24"
              />
            ))}
          </>
        )}

        {/* Cheeks */}
        <Ellipse cx="36" cy="55" rx="9" ry="6" fill={cheekColor} opacity="0.6" />
        <Ellipse cx="74" cy="55" rx="9" ry="6" fill={cheekColor} opacity="0.6" />

        {/* Eyes — ry collapses to 1.5 when blinking */}
        <Ellipse cx="44" cy="46" rx="7" ry={blink ? 1.5 : 7} fill="white" />
        <Ellipse cx="66" cy="46" rx="7" ry={blink ? 1.5 : 7} fill="white" />
        {!blink && (
          <>
            <Circle cx="46" cy="47" r="4" fill={eyeColor} />
            <Circle cx="68" cy="47" r="4" fill={eyeColor} />
            <Circle cx="47.5" cy="45.5" r="1.5" fill="white" />
            <Circle cx="69.5" cy="45.5" r="1.5" fill="white" />
          </>
        )}

        {/* Smile */}
        <Path
          d="M 44 60 Q 55 70 66 60"
          stroke={eyeColor}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />

        {/* Belly */}
        <Ellipse cx="55" cy="76" rx="14" ry="10" fill={cheekColor} opacity="0.5" />

        {/* Arms */}
        <Ellipse cx="29" cy="72" rx="7" ry="5" fill={bodyColor} transform="rotate(-20, 29, 72)" />
        <Ellipse cx="81" cy="72" rx="7" ry="5" fill={bodyColor} transform="rotate(20, 81, 72)" />
      </Svg>

      <Text style={[s.creatureName, { color: textColor }]}>{creature}</Text>
    </Animated.View>
  );
}

// ─── PARTICLE BURST ───────────────────────────────────────────────────────────
function ParticleBurst({ particles, active }: { particles: readonly string[]; active: boolean }) {
  // Each particle gets its own x/y/opacity animated value
  const anims = useRef(
    Array.from({ length: 3 }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.5),
    }))
  ).current;

  const fire = useCallback(() => {
    anims.forEach((a) => {
      a.x.setValue(0);
      a.y.setValue(0);
      a.opacity.setValue(1);
      a.scale.setValue(0.8);
    });

    const animations = anims.map((a, i) => {
      const angle = (i / 3) * 2 * Math.PI;
      const tx = 65 * Math.cos(angle);
      const ty = 65 * Math.sin(angle);
      return Animated.parallel([
        Animated.timing(a.x, { toValue: tx, duration: 800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(a.y, { toValue: ty, duration: 800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(a.opacity, { toValue: 0, duration: 800, useNativeDriver: true }),
        Animated.timing(a.scale, { toValue: 1.6, duration: 800, useNativeDriver: true }),
      ]);
    });
    Animated.parallel(animations).start();
  }, []);

  useEffect(() => {
    if (active) fire();
  }, [active]);

  if (!active) return null;

  return (
    <View style={s.burstContainer} pointerEvents="none">
      {anims.map((a, i) => (
        <Animated.Text
          key={i}
          style={[
            s.burstParticle,
            {
              transform: [{ translateX: a.x }, { translateY: a.y }, { scale: a.scale }],
              opacity: a.opacity,
            },
          ]}
        >
          {particles[i % particles.length]}
        </Animated.Text>
      ))}
    </View>
  );
}

// ─── MILESTONE ROAD ───────────────────────────────────────────────────────────
function MilestoneRoad({ currentDays }: { currentDays: number }) {
  const visible = MILESTONES.slice(0, 6);

  // Pulse anim for "next" node — same as CSS nextPulse
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.16, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={s.roadRow}>
      {visible.map((m, i) => {
        const reached = currentDays >= m.days;
        const isNext = !reached && (i === 0 || currentDays >= visible[i - 1].days);
        const isLast = i === visible.length - 1;

        return (
          <View key={m.days} style={s.roadSegment}>
            {/* Node */}
            <View style={s.roadNodeCol}>
              <Animated.View
                style={[
                  s.roadNode,
                  reached
                    ? { backgroundColor: m.color, borderColor: m.dark + '30', borderWidth: 1.5,
                        shadowColor: m.color, shadowOpacity: 0.4, shadowRadius: 5, elevation: 3 }
                    : { backgroundColor: 'rgba(0,0,0,0.05)', borderColor: 'transparent', borderWidth: 1.5 },
                  isNext && { borderColor: m.color, borderStyle: 'solid' },
                  isNext && { transform: [{ scale: pulse }] },
                ]}
              >
                <Text style={[s.roadEmoji, !reached && { opacity: 0.3 }]}>{m.emoji}</Text>
              </Animated.View>
              <Text style={[s.roadDayLabel, { color: reached ? m.dark : 'rgba(0,0,0,0.28)' }]}>
                {m.days === 0 ? 'Start' : `${m.days}d`}
              </Text>
            </View>

            {/* Connector line */}
            {!isLast && (
              <View style={s.roadLineWrapper}>
                <View
                  style={[
                    s.roadLine,
                    {
                      backgroundColor:
                        currentDays >= visible[i + 1].days
                          ? m.color
                          : currentDays > m.days
                          ? m.color + '70'
                          : 'rgba(0,0,0,0.07)',
                    },
                  ]}
                />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

// ─── ANIMATED COUNTER ─────────────────────────────────────────────────────────
function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    const start = prev.current;
    if (start === value) return;
    const dur = 600;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(start + (value - start) * eased));
      if (t < 1) requestAnimationFrame(step);
      else prev.current = value;
    };
    requestAnimationFrame(step);
  }, [value]);

  return <Text>{display}</Text>;
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export interface StreakTrackerProps {
  /** Current win-streak days from game-context (persisted, real gameplay) */
  streakDays: number;
}

export function StreakTracker({ streakDays }: StreakTrackerProps) {
  const { isDark } = useAppTheme();

  // Internal days mirrors the real streak from game-context.
  // The "+ Complete Today" button is for demo/preview; real increments come from game completions.
  const [days, setDays] = useState(streakDays);
  const [burst, setBurst] = useState(false);
  const [triggerBounce, setTriggerBounce] = useState(false);
  const [justUnlocked, setJustUnlocked] = useState<Milestone | null>(null);
  const prevMilestone = useRef<Milestone>(getMilestone(streakDays));

  // Keep in sync when game-context updates (after puzzle completion)
  useEffect(() => {
    if (streakDays === days) return;

    // Trigger animations when streak actually increases
    if (streakDays > days) {
      setTriggerBounce((b) => !b);
      wiggle.setValue(0);
      Animated.sequence([
        Animated.timing(wiggle, { toValue: -6, duration: 70, useNativeDriver: true }),
        Animated.timing(wiggle, { toValue: 6, duration: 70, useNativeDriver: true }),
        Animated.timing(wiggle, { toValue: -4, duration: 60, useNativeDriver: true }),
        Animated.timing(wiggle, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
    }

    const newM = getMilestone(streakDays);
    if (newM.days !== prevMilestone.current.days) {
      setJustUnlocked(newM);
      setBurst(true);
      setTimeout(() => setBurst(false), 1000);
      setTimeout(() => setJustUnlocked(null), 2500);
    }
    prevMilestone.current = newM;
    setDays(streakDays);
  }, [streakDays]);

  const milestone = getMilestone(days);
  const next = getNextMilestone(days);
  
  // In dark mode, the glassmorphism (milestone.days === 0) makes the background dark.
  // The default milestone.dark (deep purple) is illegible against dark gray/black backgrounds.
  // We flip it to the brighter milestone.color to ensure high contrast.
  const textColor = isDark && milestone.days === 0 ? milestone.color : milestone.dark;

  const daysToNext = next ? next.days - days : 0;
  const progressPct = next
    ? Math.min(((days - milestone.days) / (next.days - milestone.days)) * 100, 100)
    : 100;

  // Animated progress bar width (0–100 → '0%'–'100%')
  const progressAnim = useRef(new Animated.Value(progressPct)).current;
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progressPct,
      duration: 800,
      easing: Easing.out(Easing.back(1.5)),
      useNativeDriver: false, // width cannot use native driver
    }).start();
  }, [progressPct]);
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  // Counter wiggle on addDay
  const wiggle = useRef(new Animated.Value(0)).current;

  // Unlock toast slide-in opacity
  const toastAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (justUnlocked) {
      toastAnim.setValue(0);
      Animated.spring(toastAnim, { toValue: 1, friction: 6, useNativeDriver: true }).start();
    }
  }, [justUnlocked]);

  return (
    <View
      style={[
        s.card,
        milestone.days === 0
          ? {
              // Glass effect for the starting milestone
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)',
              borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.05)',
              shadowColor: isDark ? '#8b5cf6' : '#6366f1',
              shadowOpacity: isDark ? 0.3 : 0.12,
              shadowRadius: 24,
              elevation: 8,
              borderWidth: 1.5,
              borderRadius: 48,
              overflow: 'hidden',
              padding: 36,
            } as any
          : {
              backgroundColor: milestone.bg1,
              borderColor: milestone.color + '40', // Softer border
              shadowColor: milestone.color,
              borderWidth: 1,
              borderRadius: 48,
              overflow: 'hidden',
              padding: 36,
            },
      ]}
    >
      {/* ── Particle burst ── */}
      <ParticleBurst particles={milestone.particles} active={burst} />

      {/* ── Unlock toast ── */}
      {justUnlocked && (
        <Animated.View
          style={[
            s.toast,
            { shadowColor: justUnlocked.color },
            {
              opacity: toastAnim,
              transform: [
                {
                  translateY: toastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [16, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={s.toastEmoji}>{justUnlocked.emoji}</Text>
          <Text style={[s.toastText, { color: justUnlocked.dark }]}>
            {justUnlocked.label} Unlocked!
          </Text>
        </Animated.View>
      )}

      {/* ── Header ── */}
      <View style={s.header}>
        <View>
          <Text style={[s.streakLabelSmall, { color: textColor }]}>DAILY STREAK</Text>
          <Text style={[s.milestoneName, { color: textColor }]}>{milestone.label}</Text>
        </View>
      </View>

      {/* ── Creature + counter ── */}
      <View style={s.mainRow}>
        <CartoonCreature milestone={milestone} triggerBounce={triggerBounce} textColor={textColor} />

        <View style={s.counterCol}>
          {/* Counter with wiggle */}
          <Animated.Text
            style={[s.dayCounter, { color: textColor, transform: [{ translateX: wiggle }] }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            <AnimatedNumber value={days} />
          </Animated.Text>
          <Text style={[s.daysWord, { color: textColor }]}>days</Text>

          {/* "X days to next" badge */}
          {next && (
            <View style={[s.nextBadge, { backgroundColor: milestone.color + '35' }]}>
              <Text 
                style={[s.nextBadgeText, { color: textColor }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {daysToNext} day{daysToNext !== 1 ? 's' : ''} to {next.emoji}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Description ── */}
      <Text style={[s.description, { color: textColor }]}>{milestone.description}</Text>

      {/* ── Progress bar ── */}
      {next && (
        <View style={s.progressSection}>
          <View style={s.progressMeta}>
            <Text style={[s.progressLabel, { color: textColor }]}>
              Progress to {next.label}
            </Text>
            <Text style={[s.progressPct, { color: textColor }]}>
              {Math.round(progressPct)}%
            </Text>
          </View>
          <View style={s.progressTrack}>
            <Animated.View
              style={[
                s.progressFill,
                {
                  width: progressWidth,
                  backgroundColor: milestone.color,
                },
              ]}
            />
          </View>
        </View>
      )}

      {/* ── Milestone road ── */}
      <View style={s.roadWrapper}>
        <MilestoneRoad currentDays={days} />
      </View>
    </View>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  card: {
    position: 'relative',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 30,
    elevation: 10,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 26,
  },
  streakLabelSmall: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
    opacity: 0.6,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  milestoneName: {
    fontSize: 15,
    fontWeight: '700',
  },

  // Creature + counter
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 4,
  },
  creatureName: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    opacity: 0.75,
    marginTop: 4,
    textAlign: 'center',
  },
  counterCol: {
    flex: 1,
    alignItems: 'flex-end',
    paddingLeft: 8,
  },
  dayCounter: {
    fontSize: 54,
    fontWeight: '900',
    lineHeight: 58,
    letterSpacing: -2,
  },
  daysWord: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.52,
    marginTop: 2,
  },
  nextBadge: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 100,
  },
  nextBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Description
  description: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.58,
    marginBottom: 16,
    letterSpacing: 0.2,
  },

  // Progress bar
  progressSection: {
    marginBottom: 18,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 10,
    fontWeight: '700',
    opacity: 0.48,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  progressPct: {
    fontSize: 10,
    fontWeight: '700',
    opacity: 0.48,
  },
  progressTrack: {
    height: 10,
    borderRadius: 100,
    backgroundColor: 'rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 100,
  },

  // Milestone road
  roadWrapper: {
    marginBottom: 18,
  },
  roadRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roadSegment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  roadNodeCol: {
    alignItems: 'center',
    gap: 3,
  },
  roadNode: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roadEmoji: {
    fontSize: 16,
  },
  roadDayLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  roadLineWrapper: {
    flex: 1,
    paddingBottom: 18,
    paddingHorizontal: 2,
  },
  roadLine: {
    height: 4,
    borderRadius: 2,
  },

  // Add Day button
  addBtn: {
    paddingVertical: 15,
    borderRadius: 18,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 14,
    elevation: 6,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  // Particle burst
  burstContainer: {
    position: 'absolute',
    top: '38%',
    left: '45%',
    zIndex: 20,
    pointerEvents: 'none',
  } as any,
  burstParticle: {
    position: 'absolute',
    fontSize: 22,
  },

  // Unlock toast
  toast: {
    position: 'absolute',
    bottom: 86,
    alignSelf: 'center',
    width: '90%', // Using width + alignSelf instead of left/right for better responsiveness
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 14,
    zIndex: 1000, // Ensure it's above road and other elements
  },
  toastEmoji: { fontSize: 22 },
  toastText: { fontSize: 14, fontWeight: '700' },
});
