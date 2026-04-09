import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Static require — MUST be a static path for bundler to include the asset
const MUSIC_SOURCE = require('../assets/music.mp3');

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
  const playerRef = useRef<AudioPlayer | null>(null);
  const isTemporarilyPaused = useRef(false);
  const isInitialized = useRef(false);

  const setIsMusicEnabled = (val: boolean) => {
    setIsMusicEnabledState(val);
    isMusicEnabledRef.current = val;
  };

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        console.log('[Audio] Initializing expo-audio...');

        // Configure audio session
        await setAudioModeAsync({
          playsInSilentModeIOS: true,
        });

        // Read user preference
        const enabledStr = await AsyncStorage.getItem('musicEnabled');
        const initiallyEnabled = enabledStr === null ? true : enabledStr === 'true';
        console.log('[Audio] User preference:', initiallyEnabled);

        if (!isMounted) return;
        setIsMusicEnabled(initiallyEnabled);

        // Create player with expo-audio (SDK 54 compatible)
        const player = createAudioPlayer(MUSIC_SOURCE);
        player.volume = 0.3;
        player.loop = true;

        playerRef.current = player;
        isInitialized.current = true;
        console.log('[Audio] Player created successfully');

        // Play immediately if enabled
        if (initiallyEnabled) {
          player.play();
          console.log('[Audio] Playing music...');
        }

      } catch (e) {
        console.log('[Audio] Init error:', e);
      }
    };

    init();

    return () => {
      isMounted = false;
      if (playerRef.current) {
        playerRef.current.remove();
        playerRef.current = null;
      }
      isInitialized.current = false;
    };
  }, []);

  const toggleMusic = useCallback(async () => {
    const nextState = !isMusicEnabledRef.current;
    setIsMusicEnabled(nextState);
    await AsyncStorage.setItem('musicEnabled', nextState.toString());

    if (!playerRef.current || !isInitialized.current) return;

    if (nextState && !isTemporarilyPaused.current) {
      playerRef.current.play();
    } else {
      playerRef.current.pause();
    }
  }, []);

  const pauseTemporarily = useCallback(() => {
    if (!isMusicEnabledRef.current) return; // Don't pause if already disabled
    isTemporarilyPaused.current = true;
    if (playerRef.current && isInitialized.current) {
      playerRef.current.pause();
    }
  }, []);

  const resumeTemporarily = useCallback(() => {
    isTemporarilyPaused.current = false;
    if (!playerRef.current || !isInitialized.current) return;
    if (!isMusicEnabledRef.current) return;

    setTimeout(() => {
      if (playerRef.current && isMusicEnabledRef.current) {
        playerRef.current.play();
      }
    }, 300);
  }, []);

  const playAfterSplash = useCallback(() => {
    if (!playerRef.current || !isInitialized.current) return;
    if (!isMusicEnabledRef.current) return;
    if (isTemporarilyPaused.current) return;
    playerRef.current.play();
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
