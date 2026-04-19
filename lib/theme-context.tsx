import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeType = 'light' | 'dark';

export interface ThemeColors {
  id: string;
  name: string;
  background: string;
  card: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  gridBg: string;
  board: string;
  cell: string;
  highlight: string;
}

export const THEMES: Record<string, ThemeColors> = {
  zen_light: {
    id: "zen_light",
    name: "Zen Light",
    background: "#ffffff",
    board: "#f3f3f6",
    cell: "#ffffff",
    highlight: "#6945c7",
    accent: "#6945c7",
    textPrimary: "#0F172A",
    textSecondary: "#64748B",
    card: "#FFFFFF",
    gridBg: "#FFFFFF",
  },
  zen_dark: {
    id: "zen_dark",
    name: "Zen Dark",
    background: "#0f172a",
    board: "#1e293b",
    cell: "#1e293b",
    highlight: "#9c7afe",
    accent: "#9c7afe",
    textPrimary: "#F1F5F9",
    textSecondary: "#94A3B8",
    card: "#1e293b",
    gridBg: "#1E293B",
  },
  lavender_calm: {
    id: "lavender_calm",
    name: "Lavender Calm",
    background: "#FAF5FF",
    board: "#F3E8FF",
    cell: "#FFFFFF",
    highlight: "#8B5CF6",
    accent: "#8B5CF6",
    textPrimary: "#4C1D95",
    textSecondary: "#7C3AED",
    card: "#FFFFFF",
    gridBg: "#FFFFFF",
  },
  ocean_blue: {
    id: "ocean_blue",
    name: "Ocean Blue",
    background: "#F0F9FF",
    board: "#E0F2FE",
    cell: "#FFFFFF",
    highlight: "#0EA5E9",
    accent: "#0EA5E9",
    textPrimary: "#0C4A6E",
    textSecondary: "#0284C7",
    card: "#FFFFFF",
    gridBg: "#FFFFFF",
  },
  forest_green: {
    id: "forest_green",
    name: "Forest Green",
    background: "#F0FDF4",
    board: "#DCFCE7",
    cell: "#FFFFFF",
    highlight: "#22C55E",
    accent: "#22C55E",
    textPrimary: "#14532D",
    textSecondary: "#16A34A",
    card: "#FFFFFF",
    gridBg: "#FFFFFF",
  },
  sunset_warm: {
    id: "sunset_warm",
    name: "Sunset Warm",
    background: "#FFFbeb",
    board: "#FEF3C7",
    cell: "#FFFFFF",
    highlight: "#F59E0B",
    accent: "#F59E0B",
    textPrimary: "#78350F",
    textSecondary: "#D97706",
    card: "#FFFFFF",
    gridBg: "#FFFFFF",
  },
  midnight: {
    id: "midnight",
    name: "Midnight",
    background: "#020617",
    board: "#1E293B",
    cell: "#0F172A",
    highlight: "#3B82F6",
    accent: "#3B82F6",
    textPrimary: "#F8FAFC",
    textSecondary: "#94A3B8",
    card: "#0F172A",
    gridBg: "#0F172A",
  },
  minimal_clean: {
    id: "minimal_clean",
    name: "Minimal Clean",
    background: "#FFFFFF",
    board: "#F5F5F5",
    cell: "#FFFFFF",
    highlight: "#000000",
    accent: "#000000",
    textPrimary: "#000000",
    textSecondary: "#737373",
    card: "#FFFFFF",
    gridBg: "#FFFFFF",
  }
};

interface ThemeContextValue {
  theme: ThemeColors; // Resolves to Light/Dark mode
  boardTheme: ThemeColors; // Resolves to user selected theme or Light/Dark
  isDark: boolean; // Retaining for generic dark mode checks or toggles
  setTheme: (type: ThemeType) => void;
  boardThemeId: string;
  setBoardThemeId: (id: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeType, setThemeTypeState] = useState<ThemeType>('light');
  const [boardThemeIdState, setBoardThemeIdState] = useState<string>('default');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('theme');
        if (savedTheme === 'dark' || savedTheme === 'light') {
          setThemeTypeState(savedTheme as ThemeType);
        }
        
        const savedBoardThemeId = await AsyncStorage.getItem('boardTheme');
        if (savedBoardThemeId && THEMES[savedBoardThemeId]) {
            setBoardThemeIdState(savedBoardThemeId);
        }
      } catch (e) {
        console.error('Failed to load theme:', e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadTheme();
  }, []);

  const setTheme = async (type: ThemeType) => {
    setThemeTypeState(type);
    try {
      await AsyncStorage.setItem('theme', type);
    } catch (e) {
      console.error('Failed to save theme:', e);
    }
  };

  const setBoardThemeId = async (id: string) => {
    setBoardThemeIdState(id);
    try {
      if (id === 'default') {
        await AsyncStorage.removeItem('boardTheme');
      } else {
        await AsyncStorage.setItem('boardTheme', id);
      }
    } catch (e) {
      console.error('Failed to save Board theme:', e);
    }
  };

  // The overall app theme resolves rigidly to light/dark
  let appThemeColors = themeType === 'dark' ? THEMES.zen_dark : THEMES.zen_light;
  
  // The board theme can be custom customized
  let boardThemeColors = appThemeColors;
  if (boardThemeIdState !== 'default' && THEMES[boardThemeIdState]) {
    boardThemeColors = THEMES[boardThemeIdState];
  }

  // Render children even before load completes to prevent blocking splash, 
  // but theme might flicker if it defaults to light wrongly. 
  // SudoZen already handles a splash screen so it's generally fine.
  if (!isLoaded) return null;

  return (
    <ThemeContext.Provider value={{ 
        theme: appThemeColors, 
        boardTheme: boardThemeColors,
        isDark: themeType === 'dark', 
        setTheme, 
        boardThemeId: boardThemeIdState, 
        setBoardThemeId 
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useAppTheme must be used within AppThemeProvider');
  }
  return ctx;
}
