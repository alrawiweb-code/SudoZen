/**
 * Puzzle Service
 * Provides local puzzle generation — no network calls.
 */

import {
  generateSudokuPuzzle,
  type SudokuGrid,
  type Difficulty,
} from '@/lib/sudoku-engine';

export { generateSudokuPuzzle };

/**
 * Seeded pseudo-random number generator (mulberry32).
 * Given the same seed it always returns the same sequence.
 */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Derive a numeric seed from a calendar date so each day
 * produces an identical puzzle regardless of device.
 */
function seedFromDate(date: Date): number {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12
  const day = date.getDate();
  // Simple but stable: YYYYMMDD as an integer
  return year * 10000 + month * 100 + day;
}

/**
 * Generate a deterministic Sudoku puzzle for the given date.
 * Calling this function with the same date always returns the same puzzle.
 *
 * @param date - The target date (defaults to today)
 * @param difficulty - Puzzle difficulty (defaults to 'medium' for daily)
 */
export function generatePuzzleFromDate(
  date: Date = new Date(),
  difficulty: Difficulty = 'medium',
): SudokuGrid {
  const seed = seedFromDate(date);
  const rng = mulberry32(seed);

  // Override Math.random temporarily so generateSudokuPuzzle uses our seeded RNG
  const originalRandom = Math.random;
  Math.random = rng;
  try {
    return generateSudokuPuzzle(difficulty);
  } finally {
    Math.random = originalRandom;
  }
}

/**
 * Returns true if the user has already played today's daily puzzle.
 * Pass in the lastPlayedDate from game stats to check.
 */
export function hasPlayedTodaysPuzzle(lastPlayedDate: string): boolean {
  if (!lastPlayedDate) return false;
  const today = new Date().toDateString();
  const last = new Date(lastPlayedDate).toDateString();
  return today === last;
}
