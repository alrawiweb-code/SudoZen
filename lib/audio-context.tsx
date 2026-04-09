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
  const [soundLoaded, setSoundLoaded] = useState(false);
  const soundLoadedRef = useRef(false);
  const isTemporarilyPaused = useRef(false);

  useEffect(() => {
    let isMounted = true;
    
    (async () => {
      try {
        // Setup Audio session globally
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });

        // Get user preference
        const enabledStr = await AsyncStorage.getItem('musicEnabled');
        // Default to true if not explicitly set
        const initiallyEnabled = enabledStr === null ? true : (enabledStr === 'true');
        
        if (isMounted) setIsMusicEnabled(initiallyEnabled);

        // Load sound instance manually using createAsync pattern
        const { sound } = await Audio.Sound.createAsync(
          require('../assets/audio/music.mp3'),
          {
            shouldPlay: initiallyEnabled,
            isLooping: true,
            volume: 0.3,
          }
        );
        
        soundRef.current = sound;
        if (isMounted) {
          setSoundLoaded(true);
          soundLoadedRef.current = true;

        } else {
          // If unmounted during load, clean it up
          sound.unloadAsync();
        }

      } catch (e) {
        // Audio loading failed
      }
    })();

    return () => {
      isMounted = false;
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const toggleMusic = useCallback(async () => {
    const nextState = !isMusicEnabledRef.current;
    setIsMusicEnabled(nextState);
    await AsyncStorage.setItem('musicEnabled', nextState.toString());

    if (soundRef.current && soundLoadedRef.current) {
      if (nextState && !isTemporarilyPaused.current) {
        await soundRef.current.playAsync();
      } else {
        await soundRef.current.pauseAsync();
      }
    }
  }, []);

  const pauseTemporarily = useCallback(async () => {
    isTemporarilyPaused.current = true;
    if (soundRef.current && soundLoadedRef.current) {
      await soundRef.current.pauseAsync();
    }
  }, []);

  const resumeTemporarily = useCallback(async () => {
    isTemporarilyPaused.current = false;
    if (soundRef.current && soundLoadedRef.current && isMusicEnabledRef.current) {
      // Add slight delay before resuming for transition smoothness
      setTimeout(async () => {
        try {
          await soundRef.current?.playAsync();
        } catch (e) {
          // Resume failed
        }
      }, 500);
    }
  }, []);

  const playAfterSplash = useCallback(async () => {
    if (soundRef.current && soundLoadedRef.current && isMusicEnabledRef.current && !isTemporarilyPaused.current) {
      try {
        await soundRef.current.playAsync();
      } catch (e) {
        // Play failed
      }
    }
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
