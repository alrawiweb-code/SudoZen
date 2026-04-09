import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

// The music asset — must match actual file location after relocation
const MUSIC_ASSET = require('../assets/music.mp3');

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
  const splashDone = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const initAudio = async () => {
      try {
        // Step 1: Configure the audio session for Android
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: false,
        });

        // Step 2: Read user preference
        const enabledStr = await AsyncStorage.getItem('musicEnabled');
        const initiallyEnabled = enabledStr === null ? true : enabledStr === 'true';
        console.log('[Audio] User preference:', initiallyEnabled);

        if (!isMounted) return;
        setIsMusicEnabled(initiallyEnabled);

        // Step 3: Load the sound WITHOUT auto-playing first
        const { sound } = await Audio.Sound.createAsync(
          MUSIC_ASSET,
          {
            shouldPlay: false, // Don't auto-play; we'll call play explicitly
            isLooping: true,
            volume: 0.3,
            progressUpdateIntervalMillis: 1000,
          }
        );

        if (!isMounted) {
          sound.unloadAsync();
          return;
        }

        soundRef.current = sound;
        soundLoadedRef.current = true;
        console.log('[Audio] Sound loaded successfully');

        // Step 4: If splash is already done and music is enabled, play now
        if (splashDone.current && initiallyEnabled) {
          console.log('[Audio] Splash already done, playing immediately');
          await sound.playAsync();
        }

      } catch (e) {
        console.log('[Audio] Failed to load sound:', e);
      }
    };

    initAudio();

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
      await soundRef.current.playAsync().catch(e => console.log('[Audio] Play failed:', e));
    } else {
      await soundRef.current.pauseAsync().catch(e => console.log('[Audio] Pause failed:', e));
    }
  }, []);

  const pauseTemporarily = useCallback(async () => {
    isTemporarilyPaused.current = true;
    if (!soundRef.current || !soundLoadedRef.current) return;
    await soundRef.current.pauseAsync().catch(e => console.log('[Audio] Temp pause failed:', e));
  }, []);

  const resumeTemporarily = useCallback(async () => {
    isTemporarilyPaused.current = false;
    if (!soundRef.current || !soundLoadedRef.current) return;
    if (!isMusicEnabledRef.current) return;

    setTimeout(async () => {
      try {
        await soundRef.current?.playAsync();
      } catch (e) {
        console.log('[Audio] Resume failed:', e);
      }
    }, 300);
  }, []);

  // Called by AudioInitializer in _layout when splash screen finishes
  const playAfterSplash = useCallback(async () => {
    splashDone.current = true;
    console.log('[Audio] playAfterSplash called. Loaded:', soundLoadedRef.current, 'Enabled:', isMusicEnabledRef.current);

    if (!isMusicEnabledRef.current) return;

    if (soundRef.current && soundLoadedRef.current) {
      // Sound is already loaded, play it now
      await soundRef.current.playAsync().catch(e => console.log('[Audio] playAfterSplash failed:', e));
    }
    // If not loaded yet, the initAudio() effect will see splashDone=true and play after loading
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
