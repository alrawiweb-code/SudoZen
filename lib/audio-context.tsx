import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AudioContextType {
  isMusicEnabled: boolean;
  toggleMusic: () => void;
  pauseTemporarily: () => void;
  resumeTemporarily: () => void;
  playAfterSplash: () => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [isMusicEnabled, setIsMusicEnabledState] = useState<boolean>(true);
  const isMusicEnabledRef = useRef<boolean>(true);

  const setIsMusicEnabled = (val: boolean) => {
    setIsMusicEnabledState(val);
    isMusicEnabledRef.current = val;
  };

  const soundRef = useRef<Audio.Sound | null>(null);
  const soundLoadedRef = useRef(false);
  const isTemporarilyPaused = useRef(false);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        console.log("Loading music...");

        // Step 1 — Configure audio session
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
        });

        // Step 2 — Read user preference (default: enabled)
        const enabledStr = await AsyncStorage.getItem('musicEnabled');
        const initiallyEnabled = enabledStr === null ? true : enabledStr === 'true';
        if (isMounted) setIsMusicEnabled(initiallyEnabled);

        // Step 3 — Load and immediately play if enabled
        const { sound } = await Audio.Sound.createAsync(
          require('../assets/music.mp3'),
          {
            shouldPlay: initiallyEnabled,
            isLooping: true,
            volume: 0.3,
          }
        );

        console.log("Music loaded successfully");

        if (!isMounted) {
          sound.unloadAsync();
          return;
        }

        soundRef.current = sound;
        soundLoadedRef.current = true;

        if (initiallyEnabled) {
          console.log("Playing music...");
          // Belt-and-suspenders: explicitly call play even though shouldPlay: true
          await sound.playAsync().catch(() => {});
        }

      } catch (e) {
        console.log("[Audio] Error loading music:", e);
      }
    })();

    return () => {
      isMounted = false;
      soundRef.current?.unloadAsync();
      soundRef.current = null;
      soundLoadedRef.current = false;
    };
  }, []);

  const toggleMusic = useCallback(async () => {
    const nextState = !isMusicEnabledRef.current;
    setIsMusicEnabled(nextState);
    await AsyncStorage.setItem('musicEnabled', nextState.toString());

    if (!soundRef.current || !soundLoadedRef.current) return;

    if (nextState && !isTemporarilyPaused.current) {
      await soundRef.current.playAsync().catch(() => {});
    } else {
      await soundRef.current.pauseAsync().catch(() => {});
    }
  }, []);

  const pauseTemporarily = useCallback(async () => {
    // Only pause if music is enabled — don't disrupt a disabled state
    if (!isMusicEnabledRef.current) return;
    isTemporarilyPaused.current = true;
    if (soundRef.current && soundLoadedRef.current) {
      await soundRef.current.pauseAsync().catch(() => {});
    }
  }, []);

  const resumeTemporarily = useCallback(async () => {
    isTemporarilyPaused.current = false;
    if (!soundRef.current || !soundLoadedRef.current) return;
    if (!isMusicEnabledRef.current) return;

    setTimeout(async () => {
      try {
        await soundRef.current?.playAsync();
      } catch {}
    }, 300);
  }, []);

  // Called from _layout when splash screen finishes — no-op now since
  // shouldPlay:true handles it. Kept for API compatibility.
  const playAfterSplash = useCallback(async () => {
    if (!soundRef.current || !soundLoadedRef.current) return;
    if (!isMusicEnabledRef.current) return;
    if (isTemporarilyPaused.current) return;
    await soundRef.current.playAsync().catch(() => {});
  }, []);

  return (
    <AudioContext.Provider value={{ isMusicEnabled, toggleMusic, pauseTemporarily, resumeTemporarily, playAfterSplash }}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) throw new Error('useAudio must be used within AudioProvider');
  return context;
}
