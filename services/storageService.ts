/**
 * Storage Service
 * All persistence is handled locally via AsyncStorage — no network calls.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GameStats } from '@/lib/game-context';
import type { SudokuGrid } from '@/lib/sudoku-engine';

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------
const KEYS = {
  STATS: 'sudoku_stats',
  SETTINGS: 'app_settings',
  CURRENT_GAME: 'sudoku_current_game',
  LAST_PLAYED: 'sudoku_last_played',
} as const;

// ---------------------------------------------------------------------------
// App settings
// ---------------------------------------------------------------------------
export interface AppSettings {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  notificationsEnabled: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  soundEnabled: true,
  hapticsEnabled: true,
  notificationsEnabled: true,
};

export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  } catch (error) {
    // Silent fail in production
  }
}

export async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SETTINGS);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (error) {
    // Silent fail in production
  }
  return DEFAULT_SETTINGS;
}

// ---------------------------------------------------------------------------
// Game stats
// ---------------------------------------------------------------------------
export async function saveStats(stats: GameStats): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.STATS, JSON.stringify(stats));
  } catch (error) {
    // Silent fail in production
  }
}

export async function loadStats(): Promise<GameStats | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.STATS);
    if (raw) {
      const parsed = JSON.parse(raw) as GameStats;
      // Backwards-compat: older saves won't have playedDates
      if (!parsed.playedDates) parsed.playedDates = [];
      return parsed;
    }
  } catch (error) {
    // Silent fail in production
  }
  return null;
}

// ---------------------------------------------------------------------------
// Current game (resume support)
// ---------------------------------------------------------------------------

/**
 * SudokuGrid uses `Set<number>` for cell notes, which JSON doesn't handle.
 * We convert to/from plain arrays for storage.
 */
function serializeGrid(grid: SudokuGrid): string {
  const plain = {
    ...grid,
    cells: grid.cells.map(row =>
      row.map(cell => ({
        ...cell,
        notes: Array.from(cell.notes),
      })),
    ),
  };
  return JSON.stringify(plain);
}

function deserializeGrid(raw: string): SudokuGrid {
  const plain = JSON.parse(raw);
  return {
    ...plain,
    cells: plain.cells.map((row: any[]) =>
      row.map((cell: any) => ({
        ...cell,
        notes: new Set<number>(cell.notes as number[]),
      })),
    ),
  } as SudokuGrid;
}

export async function saveCurrentGame(game: SudokuGrid | null): Promise<void> {
  try {
    if (game === null) {
      await AsyncStorage.removeItem(KEYS.CURRENT_GAME);
    } else {
      await AsyncStorage.setItem(KEYS.CURRENT_GAME, serializeGrid(game));
    }
  } catch (error) {
    // Silent fail in production
  }
}

export async function loadCurrentGame(): Promise<SudokuGrid | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.CURRENT_GAME);
    if (raw) return deserializeGrid(raw);
  } catch (error) {
    // Silent fail in production
  }
  return null;
}

// ---------------------------------------------------------------------------
// Last played timestamp (used by notification scheduling)
// ---------------------------------------------------------------------------
export async function saveLastPlayed(timestamp: number): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.LAST_PLAYED, String(timestamp));
  } catch (error) {
    // Silent fail in production
  }
}

export async function loadLastPlayed(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.LAST_PLAYED);
    if (raw) return Number(raw);
  } catch (error) {
    // Silent fail in production
  }
  return null;
}
