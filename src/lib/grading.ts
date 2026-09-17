// Grading system utilities

export interface GradeScale {
  min: number;
  max: number;
  letter: string;
  gpa: number;
}

// Default grading scale (can be overridden by admin)
export const DEFAULT_GRADE_SCALE: GradeScale[] = [
  { min: 85, max: 100, letter: 'A', gpa: 4.0 },
  { min: 80, max: 84, letter: 'A-', gpa: 3.7 },
  { min: 75, max: 79, letter: 'B+', gpa: 3.3 },
  { min: 70, max: 74, letter: 'B', gpa: 3.0 },
  { min: 65, max: 69, letter: 'B-', gpa: 2.7 },
  { min: 61, max: 64, letter: 'C+', gpa: 2.3 },
  { min: 58, max: 60, letter: 'C', gpa: 2.0 },
  { min: 55, max: 57, letter: 'C-', gpa: 1.7 },
  { min: 50, max: 54, letter: 'D', gpa: 1.0 },
  { min: 0, max: 49, letter: 'F', gpa: 0.0 },
];

/**
 * Get letter grade from percentage
 */
export function getLetterGrade(percentage: number, gradeScale: GradeScale[] = DEFAULT_GRADE_SCALE): string {
  // If no grades exist (percentage is 0 and no data), return empty string instead of F
  if (percentage === 0) {
    return '';
  }

  for (const grade of gradeScale) {
    if (percentage >= grade.min && percentage <= grade.max) {
      return grade.letter;
    }
  }
  return 'F';
}

/**
 * Get GPA from percentage
 */
export function getGPA(percentage: number, gradeScale: GradeScale[] = DEFAULT_GRADE_SCALE): number {
  if (percentage === 0) {
    return 0;
  }

  for (const grade of gradeScale) {
    if (percentage >= grade.min && percentage <= grade.max) {
      return grade.gpa;
    }
  }
  return 0.0;
}

/**
 * Parse max marks from column name
 * Format: "Lab 01 (30)" -> 30
 * Format: "Assignment 1 (50)" -> 50
 */
export function parseMaxMarks(columnName: string): number | null {
  const match = columnName.match(/\((\d+(?:\.\d+)?)\)/);
  if (match) {
    return parseFloat(match[1]);
  }
  return null;
}

/**
 * Extract clean column name without marks
 * Format: "Lab 01 (30)" -> "Lab 01"
 */
export function getCleanColumnName(columnName: string): string {
  return columnName.replace(/\s*\([^)]*\)\s*$/, '').trim();
}
