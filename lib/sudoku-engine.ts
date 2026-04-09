/**
 * Sudoku Game Engine
 * Handles puzzle generation, validation, solving, and hint generation
 */

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface SudokuCell {
  value: number; // 0 = empty, 1-9 = filled
  isGiven: boolean; // true if part of initial puzzle
  isCorrect: boolean; // true if value is correct (for validation)
  notes: Set<number>; // candidate numbers for this cell
}

export interface SudokuGrid {
  cells: SudokuCell[][];
  difficulty: Difficulty;
  startTime: number;
  moves: Array<{ row: number; col: number; value: number; timestamp: number }>;
  isComplete: boolean;
}

/**
 * Generate a random Sudoku puzzle
 */
export function generateSudokuPuzzle(difficulty: Difficulty): SudokuGrid {
  // Generate a complete valid Sudoku solution
  const solution = generateCompleteSudoku();

  // Create a copy for the puzzle
  const puzzle = solution.map(row => [...row]);

  // Remove numbers based on difficulty
  const cellsToRemove = getCellsToRemoveByDifficulty(difficulty);
  removeNumbers(puzzle, cellsToRemove);

  // Convert to grid format
  const grid: SudokuGrid = {
    cells: puzzle.map(row =>
      row.map(value => ({
        value,
        isGiven: value !== 0,
        isCorrect: value !== 0,
        notes: new Set(),
      }))
    ),
    difficulty,
    startTime: Date.now(),
    moves: [],
    isComplete: false,
  };

  return grid;
}

/**
 * Generate a complete valid Sudoku solution
 */
function generateCompleteSudoku(): number[][] {
  const grid: number[][] = Array(9)
    .fill(null)
    .map(() => Array(9).fill(0));

  fillSudoku(grid);
  return grid;
}

/**
 * Recursively fill Sudoku grid using backtracking
 */
function fillSudoku(grid: number[][]): boolean {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (grid[row][col] === 0) {
        // Get valid numbers for this cell
        const validNumbers = getValidNumbers(grid, row, col);

        // Shuffle to add randomness
        shuffleArray(validNumbers);

        for (const num of validNumbers) {
          grid[row][col] = num;

          if (fillSudoku(grid)) {
            return true;
          }

          grid[row][col] = 0;
        }

        return false;
      }
    }
  }

  return true;
}

/**
 * Get valid numbers for a cell
 */
function getValidNumbers(grid: number[][], row: number, col: number): number[] {
  const valid = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);

  // Check row
  for (let c = 0; c < 9; c++) {
    valid.delete(grid[row][c]);
  }

  // Check column
  for (let r = 0; r < 9; r++) {
    valid.delete(grid[r][col]);
  }

  // Check 3x3 box
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      valid.delete(grid[r][c]);
    }
  }

  return Array.from(valid);
}

/**
 * Remove numbers from puzzle based on difficulty
 */
function removeNumbers(grid: number[][], count: number): void {
  let removed = 0;
  const cells = [];

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      cells.push({ r, c });
    }
  }

  shuffleArray(cells);

  for (const { r, c } of cells) {
    if (removed >= count) break;

    const backup = grid[r][c];
    grid[r][c] = 0;

    // Check if puzzle still has unique solution
    if (countSolutions(grid) === 1) {
      removed++;
    } else {
      grid[r][c] = backup;
    }
  }
}

/**
 * Count number of solutions for a puzzle (used to ensure unique solution)
 */
function countSolutions(grid: number[][], limit = 2): number {
  const gridCopy = grid.map(row => [...row]);
  let count = 0;

  function solve(): boolean {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (gridCopy[row][col] === 0) {
          for (let num = 1; num <= 9; num++) {
            if (isValidPlacement(gridCopy, row, col, num)) {
              gridCopy[row][col] = num;

              if (solve()) {
                return true;
              }

              gridCopy[row][col] = 0;
            }
          }

          return false;
        }
      }
    }

    count++;
    return count < limit;
  }

  solve();
  return count;
}

/**
 * Check if a number placement is valid
 */
export function isValidPlacement(
  grid: number[][],
  row: number,
  col: number,
  num: number
): boolean {
  // Check row
  for (let c = 0; c < 9; c++) {
    if (grid[row][c] === num) return false;
  }

  // Check column
  for (let r = 0; r < 9; r++) {
    if (grid[r][col] === num) return false;
  }

  // Check 3x3 box
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if (grid[r][c] === num) return false;
    }
  }

  return true;
}

/**
 * Place a number in the grid
 */
export function placeNumber(
  grid: SudokuGrid,
  row: number,
  col: number,
  value: number
): { isValid: boolean; isComplete: boolean } {
  const cell = grid.cells[row][col];

  if (cell.isGiven) {
    return { isValid: false, isComplete: false };
  }

  cell.value = value;
  cell.isCorrect = isCorrectPlacement(grid, row, col);

  // Record move
  grid.moves.push({
    row,
    col,
    value,
    timestamp: Date.now(),
  });

  // Check if puzzle is complete
  const isComplete = checkCompletion(grid);
  grid.isComplete = isComplete;

  return { isValid: cell.isCorrect, isComplete };
}

/**
 * Check if a placement is correct
 */
function isCorrectPlacement(grid: SudokuGrid, row: number, col: number): boolean {
  const value = grid.cells[row][col].value;
  if (value === 0) return false;

  // Check row
  for (let c = 0; c < 9; c++) {
    if (c !== col && grid.cells[row][c].value === value) {
      return false;
    }
  }

  // Check column
  for (let r = 0; r < 9; r++) {
    if (r !== row && grid.cells[r][col].value === value) {
      return false;
    }
  }

  // Check 3x3 box
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if ((r !== row || c !== col) && grid.cells[r][c].value === value) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Clear a cell
 */
export function clearCell(grid: SudokuGrid, row: number, col: number): void {
  const cell = grid.cells[row][col];
  if (!cell.isGiven) {
    cell.value = 0;
    cell.isCorrect = false;
    cell.notes.clear();

    grid.moves.push({
      row,
      col,
      value: 0,
      timestamp: Date.now(),
    });
  }
}

/**
 * Add/remove note from cell
 */
export function toggleNote(
  grid: SudokuGrid,
  row: number,
  col: number,
  num: number
): void {
  const cell = grid.cells[row][col];
  if (cell.value === 0) {
    if (cell.notes.has(num)) {
      cell.notes.delete(num);
    } else {
      cell.notes.add(num);
    }
  }
}

/**
 * Get hint for a cell
 */
export function getHint(grid: SudokuGrid): { row: number; col: number; value: number } | null {
  // Find empty cells
  const emptyCells = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid.cells[r][c].value === 0 && !grid.cells[r][c].isGiven) {
        emptyCells.push({ r, c });
      }
    }
  }

  if (emptyCells.length === 0) return null;

  // Pick random empty cell
  const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];

  // Find valid values
  const validValues = [];
  for (let num = 1; num <= 9; num++) {
    if (isValidPlacement(
      grid.cells.map(row => row.map(cell => cell.value)),
      r,
      c,
      num
    )) {
      validValues.push(num);
    }
  }

  if (validValues.length === 0) return null;

  // Return first valid value (could be randomized)
  return { row: r, col: c, value: validValues[0] };
}

/**
 * Check if puzzle is complete and valid
 */
function checkCompletion(grid: SudokuGrid): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = grid.cells[r][c];
      if (cell.value === 0 || !cell.isCorrect) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Get number of cells to remove based on difficulty
 */
function getCellsToRemoveByDifficulty(difficulty: Difficulty): number {
  const map = {
    easy: 30,
    medium: 40,
    hard: 50,
    expert: 60,
  };
  return map[difficulty];
}

/**
 * Shuffle array in place (Fisher-Yates)
 */
function shuffleArray<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

/**
 * Undo last move
 */
export function undoMove(grid: SudokuGrid): void {
  if (grid.moves.length === 0) return;

  const lastMove = grid.moves.pop();
  if (!lastMove) return;

  const cell = grid.cells[lastMove.row][lastMove.col];
  cell.value = 0;
  cell.isCorrect = false;
  cell.notes.clear();

  grid.isComplete = false;
}

/**
 * Restart puzzle (clear all user moves)
 */
export function restartPuzzle(grid: SudokuGrid): void {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = grid.cells[r][c];
      if (!cell.isGiven) {
        cell.value = 0;
        cell.isCorrect = false;
        cell.notes.clear();
      }
    }
  }

  grid.moves = [];
  grid.isComplete = false;
  grid.startTime = Date.now();
}

/**
 * Get puzzle statistics
 */
export function getPuzzleStats(grid: SudokuGrid): {
  filledCells: number;
  emptyCells: number;
  correctCells: number;
  incorrectCells: number;
  elapsedTime: number;
} {
  let filledCells = 0;
  let correctCells = 0;
  let incorrectCells = 0;

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = grid.cells[r][c];
      if (cell.value !== 0) {
        filledCells++;
        if (cell.isCorrect) {
          correctCells++;
        } else {
          incorrectCells++;
        }
      }
    }
  }

  return {
    filledCells,
    emptyCells: 81 - filledCells,
    correctCells,
    incorrectCells,
    elapsedTime: Date.now() - grid.startTime,
  };
}
