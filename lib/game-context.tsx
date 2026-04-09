import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
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
import { scheduleReminders } from '@/services/notificationService';

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
  | { type: 'RESUME_GAME' };

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
    expert: { played: 0, won: 0, totalTime: 0 },
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
      newStats.lastPlayedDate = new Date().toISOString();

      const diffStats = newStats.difficultyStats[difficulty];
      diffStats.played++;
      diffStats.won++;
      diffStats.totalTime += elapsedTime;

      // Update win streak
      const today = new Date().toDateString();
      const lastDate = new Date(newStats.lastPlayedDate).toDateString();
      if (today === lastDate) {
        newStats.winStreak++;
      } else {
        newStats.winStreak = 1;
      }

      // Track played date for calendar (YYYY-MM-DD, deduped)
      const todayKey = new Date().toISOString().split('T')[0];
      const existingDates = newStats.playedDates ?? [];
      if (!existingDates.includes(todayKey)) {
        newStats.playedDates = [...existingDates, todayKey];
      } else {
        newStats.playedDates = existingDates;
      }

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

    default:
      return state;
  }
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  // Load stats from storage on mount
  useEffect(() => {
    loadStatsFromStorage();
  }, []);

  // Save stats to storage whenever they change
  useEffect(() => {
    saveStatsToStorage(state.stats);
  }, [state.stats]);

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

  const completeGame = useCallback(() => {
    dispatch({ type: 'COMPLETE_GAME' });
    // Save last played time and schedule push reminders
    StorageService.saveLastPlayed(Date.now());
    scheduleReminders();
  }, []);

  const loadGame = useCallback((game: SudokuGrid) => {
    dispatch({ type: 'LOAD_GAME', payload: game });
  }, []);

  const pauseGame = useCallback(() => {
    dispatch({ type: 'PAUSE_GAME' });
  }, []);

  const resumeGame = useCallback(() => {
    dispatch({ type: 'RESUME_GAME' });
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
