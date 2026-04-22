import { describe, it, expect } from 'vitest';
import {
  generateSudokuPuzzle,
  isValidPlacement,
  placeNumber,
  clearCell,
  getHint,
  undoMove,
  restartPuzzle,
  getPuzzleStats,
  toggleNote,
} from '../lib/sudoku-engine';

// Mock data for testing
const createEmptyGrid = () =>
  Array(9)
    .fill(null)
    .map(() => Array(9).fill(0));

// Helper to find an empty non-given cell
const findEmptyCell = (puzzle: any) => {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (!puzzle.cells[r][c].isGiven && puzzle.cells[r][c].value === 0) {
        return { r, c };
      }
    }
  }
  return null;
};

describe('Sudoku Engine', () => {
  describe('generateSudokuPuzzle', () => {
    it('should generate a valid puzzle for easy difficulty', () => {
      const puzzle = generateSudokuPuzzle('easy');
      expect(puzzle).toBeDefined();
      expect(puzzle.cells).toHaveLength(9);
      expect(puzzle.cells[0]).toHaveLength(9);
      expect(puzzle.difficulty).toBe('easy');
    });

    it('should generate puzzles with different difficulties', () => {
      const difficulties = ['easy', 'medium', 'hard'] as const;
      difficulties.forEach(diff => {
        const puzzle = generateSudokuPuzzle(diff);
        expect(puzzle.difficulty).toBe(diff);
      });
    });

    it('should have some given cells', () => {
      const puzzle = generateSudokuPuzzle('medium');
      const givenCells = puzzle.cells.flat().filter(cell => cell.isGiven);
      expect(givenCells.length).toBeGreaterThan(0);
    });
  });

  describe('isValidPlacement', () => {
    it('should validate correct placements', () => {
      const grid = createEmptyGrid();

      expect(isValidPlacement(grid, 0, 0, 1)).toBe(true);
      expect(isValidPlacement(grid, 0, 1, 2)).toBe(true);
    });

    it('should reject duplicate in row', () => {
      const grid = createEmptyGrid();
      grid[0][0] = 1;

      expect(isValidPlacement(grid, 0, 1, 1)).toBe(false);
    });

    it('should reject duplicate in column', () => {
      const grid = createEmptyGrid();
      grid[0][0] = 1;

      expect(isValidPlacement(grid, 1, 0, 1)).toBe(false);
    });

    it('should reject duplicate in 3x3 box', () => {
      const grid = createEmptyGrid();
      grid[0][0] = 1;

      expect(isValidPlacement(grid, 1, 1, 1)).toBe(false);
    });
  });

  describe('placeNumber', () => {
    it('should place a number and record the move', () => {
      const puzzle = generateSudokuPuzzle('easy');
      const cell = findEmptyCell(puzzle);

      if (cell) {
        const initialMoves = puzzle.moves.length;
        const result = placeNumber(puzzle, cell.r, cell.c, 5);
        // The move should be recorded regardless of validity
        expect(puzzle.moves.length).toBe(initialMoves + 1);
        expect(puzzle.cells[cell.r][cell.c].value).toBe(5);
      }
    });

    it('should not place on given cells', () => {
      const puzzle = generateSudokuPuzzle('easy');
      // Find a given cell
      let givenRow = -1,
        givenCol = -1;
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (puzzle.cells[r][c].isGiven) {
            givenRow = r;
            givenCol = c;
            break;
          }
        }
        if (givenRow !== -1) break;
      }

      if (givenRow !== -1) {
        const result = placeNumber(puzzle, givenRow, givenCol, 5);
        expect(result.isValid).toBe(false);
      }
    });

    it('should record moves', () => {
      const puzzle = generateSudokuPuzzle('easy');
      const initialMoves = puzzle.moves.length;
      const cell = findEmptyCell(puzzle);

      if (cell) {
        placeNumber(puzzle, cell.r, cell.c, 5);
        expect(puzzle.moves.length).toBe(initialMoves + 1);
      }
    });
  });

  describe('clearCell', () => {
    it('should clear a cell', () => {
      const puzzle = generateSudokuPuzzle('easy');
      const cell = findEmptyCell(puzzle);

      if (cell) {
        placeNumber(puzzle, cell.r, cell.c, 5);
        expect(puzzle.cells[cell.r][cell.c].value).toBe(5);

        clearCell(puzzle, cell.r, cell.c);
        expect(puzzle.cells[cell.r][cell.c].value).toBe(0);
      }
    });

    it('should not clear given cells', () => {
      const puzzle = generateSudokuPuzzle('easy');
      // Find a given cell
      let givenRow = -1,
        givenCol = -1;
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (puzzle.cells[r][c].isGiven) {
            givenRow = r;
            givenCol = c;
            break;
          }
        }
        if (givenRow !== -1) break;
      }

      if (givenRow !== -1) {
        const originalValue = puzzle.cells[givenRow][givenCol].value;
        clearCell(puzzle, givenRow, givenCol);
        expect(puzzle.cells[givenRow][givenCol].value).toBe(originalValue);
      }
    });
  });

  describe('toggleNote', () => {
    it('should add and remove notes', () => {
      const puzzle = generateSudokuPuzzle('easy');
      const cell = findEmptyCell(puzzle);

      if (cell) {
        toggleNote(puzzle, cell.r, cell.c, 5);
        expect(puzzle.cells[cell.r][cell.c].notes.has(5)).toBe(true);

        toggleNote(puzzle, cell.r, cell.c, 5);
        expect(puzzle.cells[cell.r][cell.c].notes.has(5)).toBe(false);
      }
    });
  });

  describe('getHint', () => {
    it('should return a hint for empty cells', () => {
      const puzzle = generateSudokuPuzzle('easy');
      const hint = getHint(puzzle);

      if (hint) {
        expect(hint.row).toBeGreaterThanOrEqual(0);
        expect(hint.row).toBeLessThan(9);
        expect(hint.col).toBeGreaterThanOrEqual(0);
        expect(hint.col).toBeLessThan(9);
        expect(hint.value).toBeGreaterThanOrEqual(1);
        expect(hint.value).toBeLessThanOrEqual(9);
      }
    });
  });

  describe('undoMove', () => {
    it('should undo the last move', () => {
      const puzzle = generateSudokuPuzzle('easy');
      const cell = findEmptyCell(puzzle);

      if (cell) {
        placeNumber(puzzle, cell.r, cell.c, 5);
        expect(puzzle.cells[cell.r][cell.c].value).toBe(5);

        undoMove(puzzle);
        expect(puzzle.cells[cell.r][cell.c].value).toBe(0);
      }
    });

    it('should not undo when no moves exist', () => {
      const puzzle = generateSudokuPuzzle('easy');
      const initialMoves = puzzle.moves.length;

      undoMove(puzzle);
      expect(puzzle.moves.length).toBe(initialMoves);
    });
  });

  describe('restartPuzzle', () => {
    it('should clear all user moves', () => {
      const puzzle = generateSudokuPuzzle('easy');
      const cell1 = findEmptyCell(puzzle);

      if (cell1) {
        placeNumber(puzzle, cell1.r, cell1.c, 5);
        const cell2 = findEmptyCell(puzzle);
        if (cell2) {
          placeNumber(puzzle, cell2.r, cell2.c, 6);
        }

        restartPuzzle(puzzle);

        for (let r = 0; r < 9; r++) {
          for (let c = 0; c < 9; c++) {
            if (!puzzle.cells[r][c].isGiven) {
              expect(puzzle.cells[r][c].value).toBe(0);
            }
          }
        }
      }
    });

    it('should reset move history', () => {
      const puzzle = generateSudokuPuzzle('easy');
      const cell = findEmptyCell(puzzle);

      if (cell) {
        placeNumber(puzzle, cell.r, cell.c, 5);

        restartPuzzle(puzzle);
        expect(puzzle.moves.length).toBe(0);
      }
    });
  });

  describe('getPuzzleStats', () => {
    it('should calculate correct statistics', () => {
      const puzzle = generateSudokuPuzzle('easy');
      const stats = getPuzzleStats(puzzle);

      expect(stats.filledCells).toBeGreaterThanOrEqual(0);
      expect(stats.emptyCells).toBeGreaterThanOrEqual(0);
      expect(stats.filledCells + stats.emptyCells).toBe(81);
    });
  });
});
