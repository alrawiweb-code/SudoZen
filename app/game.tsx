import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ScrollView, Text, View, Pressable, Alert, StyleSheet, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useGame } from '@/lib/game-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAudio } from '@/lib/audio-context';
import { useAppTheme, ThemeColors } from '@/lib/theme-context';
import {
  ChevronLeft, Clock, PenLine, Eraser, Lightbulb, Settings,
  Play, Pause, RefreshCw, Volume2, VolumeX, BookOpen, Palette, LogOut,
} from 'lucide-react-native';


// ─── Themes ────────────────────────────────────────────────────────────────────
type GameThemeContext = {
  gradient: readonly [string, string, string];
  primary: string;
  secondary: string;
  gridBg: string;
  emptyCell: string;
  text: string;
};

function getGameTheme(themeRef: ThemeColors, isDark: boolean): GameThemeContext {
  return {
    gradient: [themeRef.background, themeRef.background, themeRef.background],
    primary: themeRef.highlight || themeRef.accent,
    secondary: themeRef.textSecondary,
    gridBg: themeRef.board || themeRef.card,
    emptyCell: themeRef.cell || (isDark ? '#020617' : '#F3F4F6'),
    text: themeRef.textPrimary,
  };
}

const PLAYFUL_HINTS = [
  "Hmm… this row feels incomplete… something is quietly missing 👀",
  "That box already knows most numbers… one is just being shy 😄",
  "Look closely… patterns don’t lie, they whisper ✨",
  "This cell is waiting for its moment… don’t ignore it 😌",
  "Not everything is random… something fits perfectly here 👁️",
  "One number is clearly avoiding attention… can you spot it?",
  "You’re closer than you think… just one step away 😉",
  "This row is confident… except for one tiny doubt 🤔",
  "A number is repeating its story somewhere else… follow it",
  "That column is almost complete… something stands out",
  "Try scanning again… something doesn’t belong where it is",
  "One of these numbers is an imposter… find it 🕵️",
  "The answer is not hiding… just waiting to be noticed",
  "Look at the box, not the chaos… clarity is there",
  "This puzzle is talking to you… are you listening?",
  "A number has only one place left… it knows where to go",
  "Something is missing… and it’s surprisingly obvious",
  "Focus on what’s NOT possible… the answer will appear",
  "This spot has fewer choices than it pretends 😏",
  "Sometimes the easiest move is the one you skip"
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
// Generate an rgba string from a hex color for highlights
function hexToRgba(hex: string, opacity: number) {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// ─── Top Bar & Timer ────────────────────────────────────────────────────────────
function TopBar({ theme }: { theme: GameThemeContext }) {
  const router = useRouter();
  const { currentGame, elapsedTime } = useGame();
  const insets = useSafeAreaInsets();

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const difficultyTitle = currentGame
    ? currentGame.difficulty.charAt(0).toUpperCase() + currentGame.difficulty.slice(1)
    : 'Loading';

  return (
    <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 16), backgroundColor: theme.gridBg + 'E6' }]}>
      <View style={styles.topBarInner}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
        >
          <ChevronLeft size={24} strokeWidth={2} color={theme.primary} />
        </Pressable>

        <Text style={[styles.topBarTitle, { color: theme.primary }]}>
          Zen Level: {difficultyTitle}
        </Text>

        <View style={[styles.timerPill, { backgroundColor: theme.emptyCell }]}>
          <Clock size={14} strokeWidth={2} color={theme.primary} />
          <Text style={[styles.timerText, { color: theme.primary }]}>
            {formatTime(elapsedTime)}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Grid ──────────────────────────────────────────────────────────────────────
function SudokuGrid({ theme, glowingCell, triggerHaptic, isDark }: { theme: GameThemeContext; glowingCell: { row: number, col: number } | null; triggerHaptic: (style: any, type?: 'impact' | 'notification') => void; isDark: boolean }) {
  const { currentGame, selectedCell, selectCell, isPaused, resumeGame } = useGame();

  // Glow animation ref
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (glowingCell) {
      glowAnim.setValue(1);
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 1500, // Fade out over 1.5 seconds
        useNativeDriver: false, // background color interpolation requires false
      }).start();
    }
  }, [glowingCell, glowAnim]);

  if (!currentGame) return null;

  const handleCellPress = (row: number, col: number) => {
    selectCell(row, col);
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
  };

  const rows = [];
  for (let r = 0; r < 9; r++) {
    const rowCells = [];
    for (let c = 0; c < 9; c++) {
      const cell = currentGame.cells[r][c];

      const isSelected = selectedCell?.row === r && selectedCell?.col === c;
      const isConflict = !cell.isCorrect && cell.value !== 0 && !cell.isGiven;
      const isInSelectedRowOrCol = selectedCell?.row === r || selectedCell?.col === c;
      const isInSelectedBlock =
        selectedCell && Math.floor(selectedCell.row / 3) === Math.floor(r / 3) && Math.floor(selectedCell.col / 3) === Math.floor(c / 3);
      const isSameValue =
        selectedCell && cell.value !== 0 && cell.value === currentGame.cells[selectedCell.row][selectedCell.col].value;

      let cellBg = theme.emptyCell;
      let textColor = theme.text;
      let textWeight: any = '500';

      if (isConflict) {
        cellBg = isDark ? 'rgba(153, 27, 27, 0.4)' : 'rgba(249, 115, 134, 0.2)';
        textColor = isDark ? '#F87171' : '#a8364b';
        textWeight = '800';
      } else if (isSelected) {
        cellBg = hexToRgba(theme.primary, isDark ? 0.3 : 0.2);
        textColor = theme.primary;
        textWeight = '800';
      } else if (isSameValue) {
        cellBg = hexToRgba(theme.primary, isDark ? 0.2 : 0.15);
        textColor = theme.primary;
      } else if (isInSelectedRowOrCol || isInSelectedBlock) {
        cellBg = hexToRgba(theme.primary, isDark ? 0.1 : 0.05);
        if (!cell.isGiven) textColor = theme.primary;
      } else if (!cell.isGiven) {
        textColor = theme.primary;
      }

      if (cell.isGiven) {
        textWeight = '800';
      }

      const isGlowing = glowingCell?.row === r && glowingCell?.col === c;

      const isThickBottom = r === 2 || r === 5;
      const isThickRight = c === 2 || c === 5;

      const borderStyles: any = {
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: isDark ? 'rgba(148, 163, 184, 0.15)' : 'rgba(150, 150, 150, 0.15)',
      };

      if (isThickBottom) {
        borderStyles.borderBottomWidth = 2;
        borderStyles.borderBottomColor = isDark ? 'rgba(148, 163, 184, 0.4)' : 'rgba(100, 100, 100, 0.4)';
      }
      if (isThickRight) {
        borderStyles.borderRightWidth = 2;
        borderStyles.borderRightColor = isDark ? 'rgba(148, 163, 184, 0.4)' : 'rgba(100, 100, 100, 0.4)';
      }

      rowCells.push(
        <Pressable
          key={`${r}-${c}`}
          onPress={() => handleCellPress(r, c)}
          style={({ pressed }) => [
            styles.cell,
            borderStyles,
            { backgroundColor: cellBg },
            pressed && { opacity: 0.7 }
          ]}
        >
          {isGlowing && (
            <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.primary, opacity: glowAnim }]} />
          )}
          {isSelected && (
            <View style={[StyleSheet.absoluteFillObject, { borderColor: theme.primary, borderWidth: 2, zIndex: 20 }]} pointerEvents="none" />
          )}
          {cell.value !== 0 ? (
            <Text style={[styles.cellText, { color: textColor, fontWeight: textWeight }, isGlowing && { color: '#FFFFFF', zIndex: 10 }]}>
              {cell.value}
            </Text>
          ) : cell.notes.size > 0 ? (
            <View style={styles.notesGrid}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <Text
                  key={`note-${num}`}
                  style={[
                    styles.noteText,
                    { color: theme.secondary, opacity: cell.notes.has(num) ? 1 : 0 }
                  ]}
                >
                  {num}
                </Text>
              ))}
            </View>
          ) : null}
        </Pressable>
      );
    }

    rows.push(
      <View key={`row-${r}`} style={styles.row}>
        {rowCells}
      </View>
    );
  }

  return (
    <View style={[styles.gridOuter, { backgroundColor: theme.emptyCell }]}>
      <View style={[styles.gridInner, { backgroundColor: theme.gridBg }]}>
        {rows}
        {isPaused && (
          <Pressable
            style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.gridBg + 'D9', zIndex: 100, alignItems: 'center', justifyContent: 'center' }]}
            onPress={resumeGame}
          >
            <Text style={{ fontSize: 24, fontWeight: '800', color: theme.primary, letterSpacing: 2 }}>PAUSED</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: theme.secondary, marginTop: 8 }}>Tap to Resume</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ─── Hint Popup Component ───────────────────────────────────────────────────────
function HintPopup({ text, visible, theme, onHide }: { text: string; visible: boolean; theme: GameThemeContext; onHide: () => void }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 40,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, fadeAnim, slideAnim]);

  return (
    <Animated.View
      pointerEvents={visible ? "box-none" : "none"}
      style={[
        styles.hintPopupContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Pressable onPress={onHide} style={({ pressed }) => [
        styles.hintPopupCard,
        { borderLeftColor: theme.primary, backgroundColor: theme.gridBg },
        pressed && { opacity: 0.9 }
      ]}>
        <View style={[styles.hintPopupIconBox, { backgroundColor: hexToRgba(theme.primary, 0.1) }]}>
          <Lightbulb size={18} strokeWidth={2} color={theme.primary} />
        </View>
        <Text style={[styles.hintPopupText, { color: theme.text }]} numberOfLines={2}>
          {text}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Notes Guide Popup ─────────────────────────────────────────────────────────
function NotesGuidePopup({ visible, theme, onDismiss, onDisable }: { visible: boolean; theme: GameThemeContext; onDismiss: () => void; onDisable: () => void }) {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true })
      ]).start();
    } else {
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  }, [visible, fadeAnim, scaleAnim]);

  return (
    <Animated.View
      pointerEvents={visible ? "auto" : "none"}
      style={[styles.notesGuideOverlay, { opacity: fadeAnim }]}
    >
      <Animated.View style={[styles.notesGuideCard, { backgroundColor: theme.gridBg, transform: [{ scale: scaleAnim }] }]}>
        <View style={[styles.notesGuideIconBox, { backgroundColor: hexToRgba(theme.primary, 0.1) }]}>
          <PenLine size={20} strokeWidth={2} color={theme.primary} />
        </View>
        <Text style={[styles.notesGuideTitle, { color: theme.text }]}>Notes Mode</Text>
        <Text style={[styles.notesGuideDesc, { color: theme.secondary }]}>
          Add small numbers to track possible answers. Tap again to remove them.
        </Text>
        <View style={{ width: '100%', gap: 12 }}>
          <Pressable
            onPress={onDismiss}
            style={({ pressed }) => [styles.notesGuideBtn, { backgroundColor: theme.primary }, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.notesGuideBtnText}>Got it</Text>
          </Pressable>
          <Pressable
            onPress={onDisable}
            style={({ pressed }) => [styles.notesGuideBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.secondary + '40' }, pressed && { opacity: 0.5 }]}
          >
            <Text style={[styles.notesGuideBtnText, { color: theme.secondary }]}>Never show again</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

// ─── Options Popup ─────────────────────────────────────────────────────────────
function OptionsPopup({ visible, theme, onResume, onPause, isPaused, onRestart, onQuit, onHowToPlay, hapticsEnabled, toggleHaptics, onThemeSelect }: any) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const { isMusicEnabled, toggleMusic } = useAudio();

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 30, duration: 200, useNativeDriver: true })
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim]);

  return (
    <Animated.View style={[styles.optionsOverlay, { opacity: fadeAnim }]} pointerEvents={visible ? "auto" : "none"}>
      <Pressable style={styles.optionsBackdrop} onPress={onResume} />
      <Animated.View style={[styles.optionsCard, { backgroundColor: theme.gridBg, transform: [{ translateY: slideAnim }] }]}>
        <View style={[styles.optionsHandle, { backgroundColor: theme.secondary + '40' }]} />
        <Text style={[styles.optionsTitle, { color: theme.text }]}>Settings</Text>

        <View style={styles.optionsList}>
          <Pressable style={styles.optionBtn} onPress={isPaused ? onResume : onPause}>
            <View style={[styles.optionIconBox, { backgroundColor: hexToRgba(theme.primary, 0.1) }]}>
              {isPaused ? <Play size={18} strokeWidth={2} color={theme.primary} /> : <Pause size={18} strokeWidth={2} color={theme.primary} />}
            </View>
            <Text style={[styles.optionText, { color: theme.text }]}>{isPaused ? 'Resume Game' : 'Pause Game'}</Text>
          </Pressable>

          <Pressable style={styles.optionBtn} onPress={onRestart}>
            <View style={[styles.optionIconBox, { backgroundColor: hexToRgba(theme.primary, 0.1) }]}>
              <RefreshCw size={18} strokeWidth={2} color={theme.primary} />
            </View>
            <Text style={[styles.optionText, { color: theme.text }]}>Restart Puzzle</Text>
          </Pressable>

          <Pressable style={styles.optionBtn} onPress={toggleMusic}>
            <View style={[styles.optionIconBox, { backgroundColor: hexToRgba(theme.primary, 0.1) }]}>
              {isMusicEnabled ? <Volume2 size={18} strokeWidth={2} color={theme.primary} /> : <VolumeX size={18} strokeWidth={2} color={theme.primary} />}
            </View>
            <View>
              <Text style={[styles.optionText, { color: theme.text }]}>Music</Text>
              <Text style={[styles.optionSub, { color: theme.secondary }]}>{isMusicEnabled ? 'On' : 'Off'}</Text>
            </View>
          </Pressable>



          <Pressable style={styles.optionBtn} onPress={onHowToPlay}>
            <View style={[styles.optionIconBox, { backgroundColor: hexToRgba(theme.primary, 0.1) }]}>
              <BookOpen size={18} strokeWidth={2} color={theme.primary} />
            </View>
            <Text style={[styles.optionText, { color: theme.text }]}>How to Play</Text>
          </Pressable>

          <Pressable style={styles.optionBtn} onPress={onThemeSelect}>
            <View style={[styles.optionIconBox, { backgroundColor: hexToRgba(theme.primary, 0.1) }]}>
              <Palette size={18} strokeWidth={2} color={theme.primary} />
            </View>
            <Text style={[styles.optionText, { color: theme.text }]}>Customize Theme</Text>
          </Pressable>

          <Pressable style={styles.optionBtn} onPress={onQuit}>
            <View style={[styles.optionIconBox, { backgroundColor: 'rgba(249, 115, 134, 0.1)' }]}>
              <LogOut size={18} strokeWidth={2} color="#a8364b" />
            </View>
            <Text style={[styles.optionText, { color: '#a8364b' }]}>Quit to Home</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

      // ─── Tools ─────────────────────────────────────────────────────────────────────
      function ToolActions({theme, onHintPress, onNotesPress, onOptionsPress, triggerHaptic}: {theme: GameThemeContext; onHintPress: () => void; onNotesPress: () => void; onOptionsPress: () => void; triggerHaptic: (style: any, type?: 'impact' | 'notification') => void }) {
  const {eraseCell, isNotesMode} = useGame();


  const handleAction = (type: string) => {
    switch (type) {
      case 'erase':
      eraseCell();
      triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
      break;
      case 'notes':
      onNotesPress();
      triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
      break;
      case 'hint':
      onHintPress();
      triggerHaptic(Haptics.NotificationFeedbackType.Success, 'notification');
      break;
      case 'settings':
      onOptionsPress();
      triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
      break;
    }
  };

      const tools = [
      {id: 'notes', IconComponent: PenLine, label: 'Notes', active: isNotesMode },
      {id: 'erase', IconComponent: Eraser, label: 'Erase' },
      {id: 'hint', IconComponent: Lightbulb, label: 'Hint' },
      {id: 'settings', IconComponent: Settings, label: 'Options' },
      ];

      return (
      <View style={styles.toolsContainer}>
        {tools.map(tool => (
          <Pressable
            key={tool.id}
            onPress={() => handleAction(tool.id)}
            style={({ pressed }) => [styles.toolBtnParent, pressed && { opacity: 0.7 }]}
          >
            <View
              style={[
                styles.toolBtn,
                { backgroundColor: tool.active ? theme.primary : theme.emptyCell },
              ]}
            >
              <tool.IconComponent size={20} strokeWidth={1.8} color={tool.active ? '#FFFFFF' : theme.text} />
            </View>
            <Text style={[styles.toolLabel, { color: tool.active ? theme.primary : theme.secondary }]}>
              {tool.label}
            </Text>
          </Pressable>
        ))}
      </View>
      );
}

      // ─── Number Pad ────────────────────────────────────────────────────────────────
      function NumberPad({theme, triggerHaptic}: {theme: GameThemeContext; triggerHaptic: (style: any, type?: 'impact' | 'notification') => void }) {
  const {placeValue} = useGame();
      const insets = useSafeAreaInsets();

  const handlePress = (num: number) => {
        placeValue(num);
      triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
  };

      return (
      <View style={[styles.numpadContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <View style={[styles.numpadGlass, { backgroundColor: theme.gridBg + 'D9' }]}>
          <View style={styles.numpadGrid}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <Pressable
                key={num}
                onPress={() => handlePress(num)}
                style={({ pressed }) => [
                  styles.numpadKey,
                  pressed && { backgroundColor: theme.primary, transform: [{ scale: 0.95 }] },
                ]}
              >
                {({ pressed }) => (
                  <Text
                    style={[
                      styles.numpadKeyText,
                      { color: pressed ? '#FFFFFF' : theme.text },
                    ]}
                  >
                    {num}
                  </Text>
                )}
              </Pressable>
            ))}
          </View>
        </View>
      </View>
      );
}

      // ─── Screen ────────────────────────────────────────────────────────────────────
      export default function GameScreen() {
  const router = useRouter();
  const { currentGame, completeGame, startNewGame, useHint: triggerRealHint, selectedCell, toggleNotesMode, isPaused, pauseGame, resumeGame, restartGame } = useGame();
  const params = useLocalSearchParams<{ difficulty?: string }>();
  const [init, setInit] = useState(false);
  const { pauseTemporarily, resumeTemporarily } = useAudio();
  const { theme: appTheme, boardTheme, isDark } = useAppTheme();

        // Menu State
        const [showOptions, setShowOptions] = useState(false);

        // Haptics Setup
        const [hapticsEnabled, setHapticsEnabled] = useState(true);

  useEffect(() => {
          AsyncStorage.getItem('hapticsEnabled').then((val) => {
            setHapticsEnabled(val === null ? true : val === 'true');
          });
  }, []);

  const triggerHaptic = useCallback((style: any = Haptics.ImpactFeedbackStyle.Light, type: 'impact' | 'notification' = 'impact') => {
    if (!hapticsEnabled) return;
        if (type === 'impact') {
          Haptics.impactAsync(style);
    } else {
          Haptics.notificationAsync(style);
    }
  }, [hapticsEnabled]);

  const handleToggleHaptics = () => {
    const nextState = !hapticsEnabled;
        setHapticsEnabled(nextState);
        AsyncStorage.setItem('hapticsEnabled', nextState.toString());
  };

        // Audio Lifecycle
        useFocusEffect(
    useCallback(() => {
          pauseTemporarily();
      return () => {
          resumeTemporarily();
      };
    }, [pauseTemporarily, resumeTemporarily])
        );

        // Notes Guide State
        const [showNotesGuide, setShowNotesGuide] = useState(false);
        const [disableNotesGuide, setDisableNotesGuide] = useState(false);

  useEffect(() => {
          AsyncStorage.getItem("disableNotesGuide").then((val) => {
            if (val === "true") setDisableNotesGuide(true);
          });
  }, []);

  const handleNotesPress = () => {
          toggleNotesMode();
        if (!disableNotesGuide) {
          setShowNotesGuide(true);
    }
  };

  const dismissNotesGuide = () => {
          setShowNotesGuide(false);
  };

  const disableNotesGuideFeature = () => {
          setShowNotesGuide(false);
        setDisableNotesGuide(true);
        AsyncStorage.setItem("disableNotesGuide", "true");
  };

        // Hint State
        const [hintCount, setHintCount] = useState(0);
        const [showHint, setShowHint] = useState(false);
        const [hintText, setHintText] = useState("");
        const hintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

        const [glowingCell, setGlowingCell] = useState<{row: number, col: number} | null>(null);

  const triggerHint = () => {
    // Clear existing timer if any
    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);

        const nextCount = hintCount + 1;
    
    if (nextCount >= 3) {
          // Real hint directly
          triggerRealHint();
        setShowHint(false); // Hide popup if currently visible
        setHintCount(0); // Loop back for next 2 indirect hints

      // We will capture the selectedCell generated by triggerRealHint inside a setTimeout
      // to allow the context dispatch to propagate first.
      setTimeout(() => {
          setGlowingCell({ row: -1, col: -1 }); // Trigger the glow effect via a fake mount, we rely on selectedCell updating
      }, 0);
    } else {
      // Indirect playful popup hint
      const randomHint = PLAYFUL_HINTS[Math.floor(Math.random() * PLAYFUL_HINTS.length)];
        setHintText(randomHint);
        setShowHint(true);
        setHintCount(nextCount);

      // Auto-hide after 5 seconds
      hintTimeoutRef.current = setTimeout(() => {
          setShowHint(false);
      }, 5000);
    }
  };

  useEffect(() => {
    // If glowing cell trigger was fired, use the actual selectedCell to mount
    if (glowingCell && glowingCell.row === -1 && selectedCell) {
          setGlowingCell(selectedCell);

       // Clean up the glowing cell state after animation completes
       setTimeout(() => {
          setGlowingCell(null);
       }, 1500);
    }
  }, [glowingCell, selectedCell]);

  useEffect(() => {
    return () => {
      if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!currentGame && !init) {
          setInit(true);
        const diff = (params.difficulty as any) ?? 'medium';
        startNewGame(diff);
        setHintCount(0); // Reset on new game
    }
  }, [currentGame, init, params.difficulty, startNewGame]);

  useEffect(() => {
    if (currentGame?.isComplete) {
          completeGame();
        setHintCount(0); // Reset on complete
        Alert.alert('🎉 Puzzle Complete!', 'Congratulations! You solved it!', [
        {
          text: 'Return Home',
          onPress: () => router.push('/'),
        },
        ]);
    }
  }, [currentGame?.isComplete, completeGame, router]);

  // Segregate themes: Main UI relies on Light/Dark lock, Board UI utilizes Custom Theme
  const mainTheme = getGameTheme(appTheme, isDark);
  const boardUiTheme = getGameTheme(boardTheme, isDark);

  if (!currentGame) {
    return (
        <LinearGradient
          colors={['#5D37BB', '#6945C7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.root, styles.centerVertical]}
        >
          <Text style={[styles.loadingText, { color: '#FFFFFF' }]}>Preparing Zen Space...</Text>
        </LinearGradient>
        );
  }

  return (
    <LinearGradient
      colors={mainTheme.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.root}
    >
      <TopBar theme={mainTheme} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <SudokuGrid theme={boardUiTheme} glowingCell={glowingCell} triggerHaptic={triggerHaptic} isDark={isDark} />
        <ToolActions theme={mainTheme} onHintPress={triggerHint} onNotesPress={handleNotesPress} onOptionsPress={() => setShowOptions(true)} triggerHaptic={triggerHaptic} />
        <View style={{ height: 100 }} /> {/* Padding for Numpad */}
      </ScrollView>
      <NumberPad theme={mainTheme} triggerHaptic={triggerHaptic} />

      <HintPopup
        visible={showHint}
        text={hintText}
        theme={mainTheme}
        onHide={() => setShowHint(false)}
      />

      <NotesGuidePopup
        visible={showNotesGuide}
        theme={mainTheme}
        onDismiss={dismissNotesGuide}
        onDisable={disableNotesGuideFeature}
      />

      <OptionsPopup
        visible={showOptions}
        theme={mainTheme}
        isPaused={isPaused}
        hapticsEnabled={hapticsEnabled}
        toggleHaptics={handleToggleHaptics}
        onPause={() => {
          pauseGame();
          setShowOptions(false);
        }}
        onResume={() => {
          resumeGame();
          setShowOptions(false);
        }}
        onRestart={() => {
          restartGame();
          setShowOptions(false);
          resumeGame();
        }}
        onQuit={() => {
          setShowOptions(false);
          router.push('/');
        }}
        onHowToPlay={() => {
          setShowOptions(false);
          router.push('/learn');
        }}
        onThemeSelect={() => {
          setShowOptions(false);
          router.push('/theme' as any);
        }}
      />
    </LinearGradient>
  );
}

        // ─── Styles ────────────────────────────────────────────────────────────────────
        const styles = StyleSheet.create({
          root: {
          flex: 1,
  },
        centerVertical: {
          justifyContent: 'center',
        alignItems: 'center',
  },
        loadingText: {
          fontWeight: '600',
        fontSize: 16,
  },
        scrollContent: {
          paddingHorizontal: 16,
        paddingTop: 24,
        alignItems: 'center',
        paddingBottom: 40,
  },

        // ── Top Bar ──
        topBar: {
    width: '100%',
    paddingHorizontal: 24,
    paddingBottom: 16,
    zIndex: 50,
  },
        topBarInner: {
          flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
  },
        backBtn: {
          padding: 8,
        marginLeft: -8,
  },
        backBtnIcon: {
          fontSize: 24,
        fontWeight: '600',
  },
        topBarTitle: {
          fontSize: 16,
        fontWeight: '800',
  },
        timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 4,
  },
        timerIcon: {
          fontSize: 14,
  },
        timerText: {
          fontSize: 14,
        fontWeight: '600',
  },

        // ── Grid ──
        gridOuter: {
    width: '100%',
    maxWidth: 400,
    padding: 8,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 32,
    elevation: 4,
    marginBottom: 32,
  },
        gridInner: {
          flexDirection: 'column',
        width: '100%',
        aspectRatio: 1,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: 'rgba(100, 100, 100, 0.4)',
        overflow: 'hidden',
  },
        row: {
          flex: 1,
        flexDirection: 'row',
  },
        cell: {
          flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
  },
        cellText: {
          fontSize: 24,
  },
        notesGrid: {
          flexDirection: 'row',
        flexWrap: 'wrap',
        width: '100%',
        height: '100%',
        padding: 2,
  },
        noteText: {
          width: '33.3%',
        height: '33.3%',
        fontSize: 8,
        textAlign: 'center',
        lineHeight: 10,
        fontWeight: '600',
  },

        // ── Tool Actions ──
        toolsContainer: {
          flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        maxWidth: 360,
        marginBottom: 40,
        paddingHorizontal: 16,
  },
        toolBtnParent: {
          alignItems: 'center',
        gap: 8,
  },
        toolBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
        toolIcon: {
          fontSize: 24,
  },
        toolLabel: {
          fontSize: 12,
        fontWeight: '500',
  },

        // ── Number Pad ──
        numpadContainer: {
          position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 40,
  },
        numpadGlass: {
    width: '90%',
    maxWidth: 500,
    borderRadius: 24,
    padding: 16,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.04,
    shadowRadius: 32,
  },
        numpadGrid: {
          flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
  },
        numpadKey: {
          flex: 1,
        aspectRatio: 1,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
  },
        numpadKeyText: {
          fontSize: 20,
        fontWeight: '700',
  },

        // ── Hint Popup ──
        hintPopupContainer: {
          position: 'absolute',
        bottom: 120, // Above the numpad
        left: 24,
        right: 24,
        zIndex: 100,
        alignItems: 'center',
  },
        hintPopupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 18,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    borderLeftWidth: 4,
    maxWidth: 400,
  },
        hintPopupIconBox: {
          width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(105, 69, 199, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
  },
        hintPopupIcon: {
          fontSize: 18,
  },
        hintPopupText: {
          flex: 1,
        fontSize: 14,
        fontWeight: '600',
        lineHeight: 20,
  },

        // ── Notes Guide ──
        notesGuideOverlay: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: 'rgba(0,0,0,0.4)',
        zIndex: 200,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
  },
        notesGuideCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
        notesGuideIconBox: {
          width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
  },
        notesGuideIcon: {
          fontSize: 24,
  },
        notesGuideTitle: {
          fontSize: 20,
        fontWeight: '800',
        marginBottom: 8,
        textAlign: 'center',
  },
        notesGuideDesc: {
          fontSize: 15,
        lineHeight: 22,
        textAlign: 'center',
        marginBottom: 24,
  },
        notesGuideBtn: {
          width: '100%',
        paddingVertical: 14,
        borderRadius: 16,
        alignItems: 'center',
  },
        notesGuideBtnText: {
          color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
  },

        // ── Options Menu ──
        optionsOverlay: {
          ...StyleSheet.absoluteFillObject,
          zIndex: 200,
        justifyContent: 'flex-end',
  },
        optionsBackdrop: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: 'rgba(0,0,0,0.4)',
  },
        optionsCard: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
        optionsHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 24,
  },
        optionsTitle: {
          fontSize: 22,
        fontWeight: '800',
        marginBottom: 20,
  },
        optionsList: {
          gap: 16,
  },
        optionBtn: {
          flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'transparent',
        padding: 16,
        borderRadius: 20,
  },
        optionIconBox: {
          width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
  },
        optionIcon: {
          fontSize: 18,
  },
        optionText: {
          fontSize: 16,
        fontWeight: '700',
  },
        optionSub: {
          fontSize: 12,
        fontWeight: '500',
        marginTop: 2,
  },
});
