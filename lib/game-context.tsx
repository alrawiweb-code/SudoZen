import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { toLocalDateString } from '@/lib/utils';
import {
  generateSudokuPuzzle,
  placeNumber,
  clearCell,
  toggleNote,
  getHint,
  undoMove,
  restartPuzzle,
  getPuzzleStats,
  type SudokuGrid,
  type Difficulty,
} from './sudoku-engine';
import * as StorageService from '@/services/storageService';
import {
  scheduleStreakNotifications,
  fireMilestoneNotification,
} from '@/services/notificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface GameStats {
  gamesPlayed: number;
  gamesWon: number;
  totalTime: number;
  winStreak: number;
  lastPlayedDate: string;
  averageTime: number;
  /** ISO date strings (YYYY-MM-DD) for every day the user completed a puzzle */
  playedDates: string[];
  difficultyStats: {
    [key in Difficulty]: {
      played: number;
      won: number;
      totalTime: number;
    };
  };
}

export interface GameContextType {
  currentGame: SudokuGrid | null;
  stats: GameStats;
  selectedCell: { row: number; col: number } | null;
  isNotesMode: boolean;
  hintsUsed: number;
  gameStartTime: number;
  elapsedTime: number;
  // Actions
  startNewGame: (difficulty: Difficulty) => void;
  selectCell: (row: number, col: number) => void;
  placeValue: (value: number) => void;
  eraseCell: () => void;
  toggleNotesMode: () => void;
  useHint: () => void;
  undoLastMove: () => void;
  restartGame: () => void;
  completeGame: () => void;
  loadGame: (game: SudokuGrid) => void;
  pauseGame: () => void;
  resumeGame: () => void;
  isPaused: boolean;
  resetStats: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

type GameAction =
  | { type: 'START_GAME'; payload: SudokuGrid }
  | { type: 'SELECT_CELL'; payload: { row: number; col: number } }
  | { type: 'PLACE_VALUE'; payload: number }
  | { type: 'ERASE_CELL' }
  | { type: 'TOGGLE_NOTES' }
  | { type: 'USE_HINT' }
  | { type: 'UNDO_MOVE' }
  | { type: 'RESTART_GAME' }
  | { type: 'COMPLETE_GAME' }
  | { type: 'LOAD_GAME'; payload: SudokuGrid }
  | { type: 'SET_STATS'; payload: GameStats }
  | { type: 'TICK_TIMER' }
  | { type: 'PAUSE_GAME' }
  | { type: 'RESUME_GAME' }
  | { type: 'RESET_STATS' };

interface GameState {
  currentGame: SudokuGrid | null;
  stats: GameStats;
  selectedCell: { row: number; col: number } | null;
  isNotesMode: boolean;
  hintsUsed: number;
  gameStartTime: number;
  elapsedTime: number;
  isPaused: boolean;
  pauseStartTime: number | null;
}

const initialStats: GameStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  totalTime: 0,
  winStreak: 0,
  lastPlayedDate: '',
  averageTime: 0,
  playedDates: [],
  difficultyStats: {
    easy: { played: 0, won: 0, totalTime: 0 },
    medium: { played: 0, won: 0, totalTime: 0 },
    hard: { played: 0, won: 0, totalTime: 0 },
  },
};

const initialState: GameState = {
  currentGame: null,
  stats: initialStats,
  selectedCell: null,
  isNotesMode: false,
  hintsUsed: 0,
  gameStartTime: 0,
  elapsedTime: 0,
  isPaused: false,
  pauseStartTime: null,
};

function cloneGrid(grid: SudokuGrid): SudokuGrid {
  return {
    ...grid,
    cells: grid.cells.map(row =>
      row.map(cell => ({
        ...cell,
        notes: new Set(cell.notes),
      }))
    ),
    moves: [...grid.moves],
  };
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME': {
      return {
        ...state,
        currentGame: action.payload,
        selectedCell: null,
        isNotesMode: false,
        hintsUsed: 0,
        gameStartTime: Date.now(),
        elapsedTime: 0,
        isPaused: false,
        pauseStartTime: null,
      };
    }

    case 'SELECT_CELL': {
      return {
        ...state,
        selectedCell: action.payload,
      };
    }

    case 'PLACE_VALUE': {
      if (!state.currentGame || !state.selectedCell) return state;

      const { row, col } = state.selectedCell;
      const newGame = cloneGrid(state.currentGame);

      if (state.isNotesMode) {
        toggleNote(newGame, row, col, action.payload);
      } else {
        placeNumber(newGame, row, col, action.payload);
      }

      return {
        ...state,
        currentGame: newGame,
      };
    }

    case 'ERASE_CELL': {
      if (!state.currentGame || !state.selectedCell) return state;

      const { row, col } = state.selectedCell;
      const newGame = cloneGrid(state.currentGame);
      clearCell(newGame, row, col);

      return {
        ...state,
        currentGame: newGame,
      };
    }

    case 'TOGGLE_NOTES': {
      return {
        ...state,
        isNotesMode: !state.isNotesMode,
      };
    }

    case 'USE_HINT': {
      if (!state.currentGame) return state;

      const hint = getHint(state.currentGame);
      if (!hint) return state;

      const newGame = cloneGrid(state.currentGame);
      placeNumber(newGame, hint.row, hint.col, hint.value);

      return {
        ...state,
        currentGame: newGame,
        hintsUsed: state.hintsUsed + 1,
        selectedCell: { row: hint.row, col: hint.col },
      };
    }

    case 'UNDO_MOVE': {
      if (!state.currentGame) return state;

      const newGame = cloneGrid(state.currentGame);
      undoMove(newGame);

      return {
        ...state,
        currentGame: newGame,
      };
    }

    case 'RESTART_GAME': {
      if (!state.currentGame) return state;

      const newGame = cloneGrid(state.currentGame);
      restartPuzzle(newGame);

      return {
        ...state,
        currentGame: newGame,
        selectedCell: null,
        isNotesMode: false,
        hintsUsed: 0,
        gameStartTime: Date.now(),
        elapsedTime: 0,
        isPaused: false,
        pauseStartTime: null,
      };
    }

    case 'COMPLETE_GAME': {
      if (!state.currentGame) return state;

      const elapsedTime = Date.now() - state.gameStartTime;
      const difficulty = state.currentGame.difficulty;

      const newStats = { ...state.stats };
      newStats.gamesPlayed++;
      newStats.gamesWon++;
      newStats.totalTime += elapsedTime;
      newStats.averageTime = newStats.totalTime / newStats.gamesWon;

      // Deep clone difficultyStats
      newStats.difficultyStats = {
        ...newStats.difficultyStats,
        [difficulty]: {
          ...newStats.difficultyStats[difficulty],
          played: newStats.difficultyStats[difficulty].played + 1,
          won: newStats.difficultyStats[difficulty].won + 1,
          totalTime: newStats.difficultyStats[difficulty].totalTime + elapsedTime,
        },
      }
      
      // ── Streak logic (strictly local date to prevent timezone drifts) ─────
      const todayDate = new Date();
      const todayStr = toLocalDateString(todayDate);
      const lastPlayedStr = newStats.lastPlayedDate
        ? toLocalDateString(new Date(newStats.lastPlayedDate))
        : '';
        
      let streak = newStats.winStreak || 0;

      if (lastPlayedStr !== todayStr) {
        if (lastPlayedStr) {
          // Compare midnight-normalized dates
          const todayMs = new Date(todayStr).getTime();
          const lastMs = new Date(lastPlayedStr).getTime();
          const diff = Math.round((todayMs - lastMs) / (1000 * 60 * 60 * 24));
          
          if (diff === 1) {
            streak += 1;
          } else {
            streak = 1; // gap detected, reset
          }
        } else {
          streak = 1;
        }

        // Record today in stats
        const existingDates = newStats.playedDates ?? [];
        if (!existingDates.includes(todayStr)) {
          newStats.playedDates = [...existingDates, todayStr];
        }
      }

      newStats.winStreak = streak;
      // Store full ISO string for other operations, but the timezone constraint
      // holds true via toLocalDateString checks
      newStats.lastPlayedDate = todayDate.toISOString();

      return {
        ...state,
        stats: newStats,
        elapsedTime,
      };
    }

    case 'LOAD_GAME': {
      return {
        ...state,
        currentGame: action.payload,
        selectedCell: null,
        isNotesMode: false,
        hintsUsed: 0,
        gameStartTime: Date.now(),
        elapsedTime: 0,
        isPaused: false,
        pauseStartTime: null,
      };
    }

    case 'SET_STATS': {
      return {
        ...state,
        stats: action.payload,
      };
    }

    case 'TICK_TIMER': {
      if (state.isPaused) return state;
      return {
        ...state,
        elapsedTime: Date.now() - state.gameStartTime,
      };
    }

    case 'PAUSE_GAME': {
      if (state.isPaused) return state;
      return {
        ...state,
        isPaused: true,
        pauseStartTime: Date.now(),
      };
    }

    case 'RESUME_GAME': {
      if (!state.isPaused || !state.pauseStartTime) return state;
      const pausedDuration = Date.now() - state.pauseStartTime;
      return {
        ...state,
        isPaused: false,
        pauseStartTime: null,
        gameStartTime: state.gameStartTime + pausedDuration,
      };
    }

    case 'RESET_STATS': {
      return {
        ...state,
        stats: initialStats,
      };
    }

    default:
      return state;
  }
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  // Load stats and progress from storage on mount
  useEffect(() => {
    loadStatsFromStorage();
    StorageService.loadCurrentGame().then(saved => {
      if (saved) dispatch({ type: 'LOAD_GAME', payload: saved });
    });
  }, []);

  // Save stats to storage whenever they change
  useEffect(() => {
    saveStatsToStorage(state.stats);
  }, [state.stats]);

  // Save current game progress
  useEffect(() => {
    if (state.currentGame) {
      StorageService.saveCurrentGame(state.currentGame);
    }
  }, [state.currentGame]);

  // Timer interval
  useEffect(() => {
    if (!state.currentGame || state.isPaused) return;

    const interval = setInterval(() => {
      dispatch({ type: 'TICK_TIMER' });
    }, 1000);

    return () => clearInterval(interval);
  }, [state.currentGame, state.isPaused]);

  const loadStatsFromStorage = async () => {
    const stats = await StorageService.loadStats();
    if (stats) {
      dispatch({ type: 'SET_STATS', payload: stats });
    }
  };

  const saveStatsToStorage = async (stats: GameStats) => {
    await StorageService.saveStats(stats);
  };

  const startNewGame = useCallback((difficulty: Difficulty) => {
    const puzzle = generateSudokuPuzzle(difficulty);
    dispatch({ type: 'START_GAME', payload: puzzle });
  }, []);

  const selectCell = useCallback((row: number, col: number) => {
    dispatch({ type: 'SELECT_CELL', payload: { row, col } });
  }, []);

  const placeValue = useCallback((value: number) => {
    dispatch({ type: 'PLACE_VALUE', payload: value });
  }, []);

  const eraseCell = useCallback(() => {
    dispatch({ type: 'ERASE_CELL' });
  }, []);

  const toggleNotesMode = useCallback(() => {
    dispatch({ type: 'TOGGLE_NOTES' });
  }, []);

  const useHint = useCallback(() => {
    dispatch({ type: 'USE_HINT' });
  }, []);

  const undoLastMove = useCallback(() => {
    dispatch({ type: 'UNDO_MOVE' });
  }, []);

  const restartGame = useCallback(() => {
    dispatch({ type: 'RESTART_GAME' });
  }, []);

  const completeGame = useCallback(async () => {
    if (state.currentGame) {
      const difficulty = state.currentGame.difficulty;
      const elapsedTime = Date.now() - state.gameStartTime;
      const key = `bestTime_${difficulty}`;
      try {
        const saved = await AsyncStorage.getItem(key);
        if (!saved || elapsedTime < parseInt(saved, 10)) {
          await AsyncStorage.setItem(key, String(elapsedTime));
        }
      } catch (e) {}
    }

    // ── Pre-compute new streak (mirrors COMPLETE_GAME reducer) ──────────────
    // We compute here so we can pass accurate values to the notification system
    // BEFORE dispatching (since state updates are async after dispatch).
    const today = new Date().toDateString();
    const lastPlayed = state.stats.lastPlayedDate
      ? new Date(state.stats.lastPlayedDate).toDateString()
      : '';
    const prevStreak = state.stats.winStreak || 0;

    let newStreak = prevStreak;
    let isFirstPlayToday = false;

    if (lastPlayed !== today) {
      isFirstPlayToday = true;
      if (lastPlayed) {
        const diff = Math.round(
          (new Date(today).getTime() - new Date(lastPlayed).getTime()) / (1000 * 60 * 60 * 24)
        );
        newStreak = diff === 1 ? prevStreak + 1 : 1;
      } else {
        newStreak = 1;
      }
    }

    // Dispatch the game completion (updates stats in reducer + AsyncStorage)
    dispatch({ type: 'COMPLETE_GAME' });
    StorageService.saveLastPlayed(Date.now());

    // ── Notifications ───────────────────────────────────────────────────────
    // Reschedule the 7 PM / 8 PM slots reflecting the new completion state.
    // Pass today's ISO so hasCompletedToday() returns true → suppresses reminders.
    scheduleStreakNotifications(newStreak, new Date().toISOString());

    // Fire an instant milestone notification only on first play of the day
    // and only when a milestone threshold is newly crossed.
    if (isFirstPlayToday && newStreak !== prevStreak) {
      const MILESTONE_DAYS = [3, 5, 7, 14, 30, 60, 100];
      if (MILESTONE_DAYS.includes(newStreak)) {
        fireMilestoneNotification(newStreak);
      }
    }
  }, [state.currentGame, state.gameStartTime, state.stats]);

  const loadGame = useCallback((game: SudokuGrid) => {
    dispatch({ type: 'LOAD_GAME', payload: game });
  }, []);

  const pauseGame = useCallback(() => {
    dispatch({ type: 'PAUSE_GAME' });
  }, []);

  const resumeGame = useCallback(() => {
    dispatch({ type: 'RESUME_GAME' });
  }, []);

  const resetStats = useCallback(() => {
    dispatch({ type: 'RESET_STATS' });
  }, []);

  const value: GameContextType = {
    currentGame: state.currentGame,
    stats: state.stats,
    selectedCell: state.selectedCell,
    isNotesMode: state.isNotesMode,
    hintsUsed: state.hintsUsed,
    gameStartTime: state.gameStartTime,
    elapsedTime: state.elapsedTime,
    startNewGame,
    selectCell,
    placeValue,
    eraseCell,
    toggleNotesMode,
    useHint,
    undoLastMove,
    restartGame,
    completeGame,
    loadGame,
    pauseGame,
    resumeGame,
    isPaused: state.isPaused,
    resetStats,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextType {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameProvider');
  }
  return context;
}
