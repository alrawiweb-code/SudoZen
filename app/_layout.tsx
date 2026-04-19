import "@/global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { Platform, AppState } from "react-native";
import "@/lib/_core/nativewind-pressable";
import { ThemeProvider } from "@/lib/theme-provider";
import { AppThemeProvider } from "@/lib/theme-context";
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import type { EdgeInsets, Rect } from "react-native-safe-area-context";
import { GameProvider, useGame } from "@/lib/game-context";
import { AudioProvider } from "@/lib/audio-context";
import {
  scheduleStreakNotifications,
  ensureAndroidChannels,
  requestPermissions,
} from "@/services/notificationService";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ZenSplashScreen } from "@/components/zen-splash-screen";
import { useAudio } from "@/lib/audio-context";

function AudioInitializer({ showSplash }: { showSplash: boolean }) {
  const { playAfterSplash } = useAudio();
  useEffect(() => {
    if (!showSplash) {
      playAfterSplash();
    }
  }, [showSplash, playAfterSplash]);
  return null;
}

/**
 * NotificationScheduler — Lives inside GameProvider so it can read streak state.
 * Reschedules the 7 PM / 8 PM daily slots on cold start and every foreground resume.
 * Uses real stats so the scheduler knows whether to suppress reminders today.
 */
function NotificationScheduler() {
  const { stats } = useGame();

  const reschedule = useCallback(() => {
    if (Platform.OS === 'web') return;
    AsyncStorage.getItem('app_settings').then((saved) => {
      let notificationsEnabled = true;
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.notificationsEnabled === false) notificationsEnabled = false;
        } catch {}
      }
      if (notificationsEnabled) {
        ensureAndroidChannels().then(() => {
          requestPermissions().then((granted) => {
            if (granted) {
              scheduleStreakNotifications(
                stats.winStreak,
                stats.lastPlayedDate,
              );
            }
          });
        });
      }
    });
  }, [stats.winStreak, stats.lastPlayedDate]);

  // On cold start
  useEffect(() => { reschedule(); }, []);

  // On every foreground resume
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') reschedule();
    });
    return () => sub.remove();
  }, [reschedule]);

  return null;
}

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);
  const handleSplashFinish = useCallback(() => setShowSplash(false), []);
  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;

  // ── Notification scheduling handled by NotificationScheduler
  // (mounted inside GameProvider below so it can read real streak stats)

  // Ensure minimum padding for top and bottom on mobile
  const providerInitialMetrics = useMemo(() => {
    const metrics = initialWindowMetrics ?? { insets: initialInsets, frame: initialFrame };
    return {
      ...metrics,
      insets: {
        ...metrics.insets,
        top: Math.max(metrics.insets.top, 16),
        bottom: Math.max(metrics.insets.bottom, 12),
      },
    };
  }, [initialInsets, initialFrame]);

  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppThemeProvider>
        <AudioProvider>
      <GameProvider>
          <NotificationScheduler />
          <AudioInitializer showSplash={showSplash} />
          {/* Default to hiding native headers so raw route segments don't appear */}
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="game" />
            <Stack.Screen name="privacy-policy" />
            <Stack.Screen name="about" />
          </Stack>
          <StatusBar style="auto" />
        </GameProvider>
      </AudioProvider>
      </AppThemeProvider>
      {/* Animated splash — renders on top until animation completes */}
      {showSplash && <ZenSplashScreen onFinish={handleSplashFinish} />}
    </GestureHandlerRootView>
  );

  // On web, provide custom safe area context values
  if (Platform.OS === "web") {
    return (
      <ThemeProvider>
        <SafeAreaProvider initialMetrics={providerInitialMetrics}>
          <SafeAreaFrameContext.Provider value={initialFrame}>
            <SafeAreaInsetsContext.Provider value={initialInsets}>
              {content}
            </SafeAreaInsetsContext.Provider>
          </SafeAreaFrameContext.Provider>
        </SafeAreaProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider initialMetrics={providerInitialMetrics}>{content}</SafeAreaProvider>
    </ThemeProvider>
  );
}
