import "@/global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { Platform } from "react-native";
import "@/lib/_core/nativewind-pressable";
import { ThemeProvider } from "@/lib/theme-provider";
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import type { EdgeInsets, Rect } from "react-native-safe-area-context";
import { GameProvider } from "@/lib/game-context";
import { AudioProvider } from "@/lib/audio-context";
import { scheduleReminders, requestPermissions } from "@/services/notificationService";
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

  // Request notification permissions on first launch (native only)
  useEffect(() => {
    if (Platform.OS !== "web") {
      AsyncStorage.getItem('app_settings').then((saved) => {
        let isEnabled = true; // Default
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed.notificationsEnabled === false) {
              isEnabled = false;
            }
          } catch {}
        }
        
        if (isEnabled) {
          requestPermissions().then((granted) => {
            if (granted) {
              scheduleReminders();
            }
          });
        }
      });
    }
  }, []);

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
      <AudioProvider>
        <GameProvider>
          <AudioInitializer showSplash={showSplash} />
          {/* Default to hiding native headers so raw route segments don't appear */}
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="game" />
          </Stack>
          <StatusBar style="auto" />
        </GameProvider>
      </AudioProvider>
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
