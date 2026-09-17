// Student data fetching utilities

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  getAllLabs,
  getAllAssignments,
  getAllQuizzes,
  isSolutionVisible,
  type Lab,
  type Assignment,
  type Quiz,
} from './content';
import {
  getStudentGradeData,
  getGradeSheetConfig,
  getGradeSheetConfigById,
  type GradeData,
} from './googleSheets';
import { parseMaxMarks, getCleanColumnName } from './grading';

/**
 * Get student's grade data from all tabs, filtered by visible columns
 * Returns data organized by tabs (dynamic, not hardcoded categories)
 */
export async function getStudentGrades(rollNumber: string, section?: 'CS-F26-M' | 'CS-F26-A'): Promise<{
  tabs: Array<{
    name: string;
    items: Array<{
      id: string;
      title: string;
      score: number;
      total: number;
      columnName: string;
      isBonusOrPenalty?: boolean;
    }>;
    visible: boolean;
  }>;
  // Legacy format for backward compatibility
  labs: any[];
  assignments: any[];
  quizzes: any[];
  exams: any[];
}> {
  const gradeData = await getStudentGradeData(rollNumber);
  
  // Get grade sheet config to know which columns are visible
  // CRITICAL: Always use section-based config to ensure correct visibility settings
  // Using sheet_id alone can cause mismatches when same sheet is used for multiple sections
  let gradeSheetConfig = null;
  
  // Always prioritize section-based config (this matches how admin updates visibility)
  // This is CRITICAL - visibility settings are section-specific
  const targetSection = section || 'CS-F26-M';
  gradeSheetConfig = await getGradeSheetConfig(targetSection);
  
  // If no section config found and we have grade data, try by sheet_id but verify section match
  // This is a fallback only - section-based lookup should always be used
  if (!gradeSheetConfig && gradeData.length > 0) {
    const sheetId = gradeData[0].sheet_id;
    const fallbackConfig = await getGradeSheetConfigById(sheetId);
    
    // Only use fallback if it matches the target section (safety check)
    if (fallbackConfig && (fallbackConfig as any).section === targetSection) {
      gradeSheetConfig = fallbackConfig;
    } else if (fallbackConfig) {
      // Config found but section doesn't match - this is a problem
      console.warn(
        `Grade sheet config found for sheet ${sheetId} but section mismatch. ` +
        `Expected: ${targetSection}, Found: ${(fallbackConfig as any).section}. ` +
        `Visibility settings may not apply correctly.`
      );
    }
  }
  
  // Warn if no config found at all - visibility settings won't work
  if (!gradeSheetConfig) {
    console.warn(
      `No grade sheet config found for section ${targetSection} and roll number ${rollNumber}. ` +
      `All columns will be shown. Please configure the grade sheet in admin panel.`
    );
  }

  // Validate tabs array if config exists
  if (gradeSheetConfig && (!Array.isArray(gradeSheetConfig.tabs) || gradeSheetConfig.tabs.length === 0)) {
    console.warn(
      `Grade sheet config found but tabs array is invalid or empty. ` +
      `This might cause visibility issues. Please reconfigure the grade sheet in admin panel.`
    );
    // Set tabs to empty array to prevent errors
    gradeSheetConfig.tabs = [];
  }

  const tabsMap = new Map<string, {
    name: string;
    items: Array<{
      id: string;
      title: string;
      score: number;
      total: number;
      columnName: string;
      isBonusOrPenalty?: boolean;
    }>;
    visible: boolean;
  }>();

  // Legacy arrays for backward compatibility
  const labs: any[] = [];
  const assignments: any[] = [];
  const quizzes: any[] = [];
  const exams: any[] = [];

  gradeData.forEach((data) => {
    const tabData = data.data as any;
    const tabName = data.tab_name;
    const tabNameLower = tabName.toLowerCase();

    // Get tab config from grade sheet
    // CRITICAL: Match tab names exactly (case-insensitive, trimmed)
    const tabConfig = gradeSheetConfig?.tabs && Array.isArray(gradeSheetConfig.tabs)
      ? (gradeSheetConfig.tabs as any[]).find((t: any) => {
          // Guard against null/undefined tab objects
          if (!t || !t.name) return false;
          const configTabName = (t.name || '').trim().toLowerCase();
          const dataTabName = tabName.trim().toLowerCase();
          return configTabName === dataTabName;
        })
      : null;

    // Check if tab is visible (default to true if no config)
    // Explicitly check: if visible is undefined or true, show it; only hide if explicitly false
    // Use optional chaining to safely access visible property
    const tabVisible = !tabConfig || tabConfig.visible === undefined || tabConfig.visible === true;

    // If tab is hidden, completely skip it - don't add to map at all
    if (!tabVisible) {
      return; // Don't process this tab at all if it's hidden
    }

    // Initialize tab if not exists (only for visible tabs)
    if (!tabsMap.has(tabName)) {
      tabsMap.set(tabName, {
        name: tabName,
        items: [],
        visible: true, // Only visible tabs are in the map
      });
    }

    const tab = tabsMap.get(tabName)!;

    // Get visible columns for this tab
    // CRITICAL: If gradeSheetConfig exists, we MUST respect visibility settings
    // If tabConfig exists but visibleColumns is undefined, that's an error - don't show all columns
    // Only show all columns if there's NO config at all (gradeSheetConfig is null)
    let visibleColumns: string[];
    if (!gradeSheetConfig) {
      // No config at all - show all columns as fallback
      visibleColumns = Object.keys(tabData);
    } else if (tabConfig?.visibleColumns !== undefined) {
      // Config exists and has visibleColumns defined - use it (even if empty array)
      visibleColumns = tabConfig.visibleColumns;
    } else if (tabConfig) {
      // Config exists for this tab but visibleColumns is undefined - this shouldn't happen
      // But to be safe, show all columns (this is a data inconsistency issue)
      console.warn(`Tab ${tabName} has config but no visibleColumns defined. Showing all columns.`);
      visibleColumns = Object.keys(tabData);
    } else {
      // gradeSheetConfig exists but this specific tab has no config
      // This means the tab was added to the sheet but not yet configured
      // Show all columns as default
      visibleColumns = Object.keys(tabData);
    }

    // Normalize visible columns for comparison (handles case/whitespace mismatches)
    const normalizedVisibleColumns = new Set(
      visibleColumns.map(col => (col || '').trim().toLowerCase())
    );

    // Process each column in the tab data
    Object.keys(tabData).forEach((columnName) => {
      // Skip if column is not visible (case-insensitive, trimmed comparison)
      // This handles cases where column names in config might have different casing/whitespace
      const normalizedColumnName = (columnName || '').trim().toLowerCase();
      if (!normalizedVisibleColumns.has(normalizedColumnName)) {
        return;
      }

      // Skip roll number, name columns
      if (
        columnName.toLowerCase().includes('roll') ||
        columnName.toLowerCase() === 'student name' ||
        columnName.toLowerCase() === 'name'
      ) {
        return;
      }

      // Skip summary/calculated columns (PCT %, TOTAL, but allow LAB PENALTY and COURSE PENALTY)
      const columnLower = columnName.toLowerCase().trim();
      if (
        columnLower.includes('pct') ||
        (columnLower.includes('total') && !columnLower.includes('penalty')) ||
        (columnLower.includes('percentage') && !columnLower.includes('penalty')) ||
        columnLower === '%'
      ) {
        return;
      }

      const value = tabData[columnName];
      
      // Handle 0 explicitly - 0 is a valid score and should be included in calculations
      // Check if value is null, undefined, or empty string first (these should be skipped)
      if (value === null || value === undefined || value === '') {
        return;
      }
      
      // Explicitly check for 0 (both number and string) - 0 is valid and should be processed
      const isZero = value === 0 || value === '0';
      
      // Convert to number - handle both string "0" and number 0
      let score: number;
      if (typeof value === 'number') {
        score = value;
      } else {
        score = parseFloat(String(value));
      }
      
      // Skip if not a valid number (but explicitly allow 0)
      // isNaN(0) = false, so 0 will pass this check
      if (!isZero && isNaN(score)) {
        return;
      }
      
      // Ensure we have a valid number (including 0)
      // If it's explicitly 0 or "0", use 0; otherwise use the parsed score
      const finalScore = isZero ? 0 : (isNaN(score) ? 0 : score);

      // Parse max marks from column name (e.g., "Lab 01 (30)" -> 30)
      const maxMarks = parseMaxMarks(columnName);
      
      // Check if this is a penalty or bonus column (LAB PENALTY, COURSE PENALTY, or bonus like +1, +2)
      // Also check if tab name is "Extra" - all columns in Extra tab should be treated as bonus/penalty
      const tabIsExtra = tabNameLower.includes('extra') || tabNameLower.includes('bonus');
      const isPenaltyOrBonus = columnLower.includes('penalty') || 
                                columnLower.includes('bonus') ||
                                /^\+?\d+$/.test(columnName.trim()) || 
                                columnName.trim().startsWith('+') ||
                                tabIsExtra; // If tab is "Extra", treat all columns as bonus/penalty
      
      // If no max marks and not a penalty/bonus, check if it matches grade patterns
      if (!maxMarks && !isPenaltyOrBonus) {
        const hasGradePattern = /^(lab|assignment|quiz|exam|midterm|final)\s*\d+/i.test(columnName);
        if (!hasGradePattern) {
          return; // Skip columns that don't match grade item patterns
        }
      }
      
      // For penalty/bonus columns (including Extra tab), treat as single value (no division)
      // For regular columns, use parsed marks or default to 20
      const finalMaxMarks = isPenaltyOrBonus && !maxMarks ? finalScore : (maxMarks || 20);
      const cleanName = getCleanColumnName(columnName);

      // Add to tab items
      // For penalty/bonus columns, show as single value (score = total, so percentage is 100%)
      tab.items.push({
        id: `${tabName}-${columnName}`,
        title: cleanName,
        score: finalScore, // Use finalScore which explicitly handles 0
        total: isPenaltyOrBonus && !maxMarks ? finalScore : finalMaxMarks, // For bonuses/penalties, total = score
        columnName: columnName,
        isBonusOrPenalty: isPenaltyOrBonus || tabIsExtra, // Flag to indicate this is a bonus/penalty (including Extra tab)
      });

      // Also add to legacy arrays for backward compatibility
      const legacyItem = {
        id: `${tabName}-${columnName}`,
        title: cleanName,
        score: finalScore, // Use finalScore which explicitly handles 0
        total: isPenaltyOrBonus && !maxMarks ? finalScore : finalMaxMarks,
        date: tabData.date || null,
        isBonusOrPenalty: isPenaltyOrBonus || tabIsExtra,
      };
      
      if (tabNameLower.includes('lab')) {
        labs.push(legacyItem);
      } else if (tabNameLower.includes('assignment')) {
        assignments.push(legacyItem);
      } else if (tabNameLower.includes('quiz')) {
        quizzes.push(legacyItem);
      } else if (tabNameLower.includes('midterm') || tabNameLower.includes('final')) {
        exams.push(legacyItem);
      }
    });

    // Sort items numerically if possible
    tab.items.sort((a, b) => {
      // Extract numbers
      const numA = parseInt(a.title.replace(/\D/g, '') || '0');
      const numB = parseInt(b.title.replace(/\D/g, '') || '0');
      
      // If both have numbers, sort by ID/Number (Descending: Bigger/Newer first)
      if (numA !== 0 && numB !== 0) {
        return numB - numA;
      }
      
      // Fallback to alphabetical
      return a.title.localeCompare(b.title);
    });
  });

  return {
    tabs: Array.from(tabsMap.values()),
    labs,
    assignments,
    quizzes,
    exams,
  };
}

/**
 * Get student dashboard statistics
 * Aggregates from visible grade tabs (same data Grades page uses),
 * not only legacy arrays keyed by tab-name keywords.
 */
export async function getStudentStats(rollNumber: string, section?: 'CS-F26-M' | 'CS-F26-A'): Promise<{
  overallLabGrade: number; // Lab percentage
  overallCourseGrade: number; // Course percentage (assignments, quizzes, exams, etc.)
  labs: { score: number; total: number; count: number };
  assignments: { score: number; total: number; count: number };
  quizzes: { score: number; total: number; count: number };
  exams: { score: number; total: number; count: number };
  overall: number; // Legacy - combined (for backward compatibility)
}> {
  const grades = await getStudentGrades(rollNumber, section);

  type StatItem = { score: number; total: number; isBonusOrPenalty?: boolean };
  const labsItems: StatItem[] = [];
  const assignmentsItems: StatItem[] = [];
  const quizzesItems: StatItem[] = [];
  const examsItems: StatItem[] = [];

  for (const tab of grades.tabs) {
    if (tab.visible === false) continue;

    const tabNameLower = (tab.name || '').toLowerCase();
    const items = (tab.items || []).filter((item) => !item.isBonusOrPenalty);

    for (const item of items) {
      const entry: StatItem = {
        score: item.score ?? 0,
        total: item.total ?? 0,
        isBonusOrPenalty: item.isBonusOrPenalty,
      };

      if (tabNameLower.includes('lab')) {
        labsItems.push(entry);
      } else if (tabNameLower.includes('assignment')) {
        assignmentsItems.push(entry);
      } else if (tabNameLower.includes('quiz')) {
        quizzesItems.push(entry);
      } else if (tabNameLower.includes('midterm') || tabNameLower.includes('final') || tabNameLower.includes('exam')) {
        examsItems.push(entry);
      } else {
        // Unnamed / custom tabs (Sessional, Marks, etc.) still count toward course grade
        examsItems.push(entry);
      }
    }
  }

  const sumScore = (items: StatItem[]) => items.reduce((acc, i) => acc + (i.score ?? 0), 0);
  const sumTotal = (items: StatItem[]) => items.reduce((acc, i) => acc + (i.total ?? 0), 0);

  const labsTotal = sumScore(labsItems);
  const labsMax = sumTotal(labsItems);
  const labsCount = labsItems.length;

  const assignmentsTotal = sumScore(assignmentsItems);
  const assignmentsMax = sumTotal(assignmentsItems);
  const assignmentsCount = assignmentsItems.length;

  const quizzesTotal = sumScore(quizzesItems);
  const quizzesMax = sumTotal(quizzesItems);
  const quizzesCount = quizzesItems.length;

  const examsTotal = sumScore(examsItems);
  const examsMax = sumTotal(examsItems);
  const examsCount = examsItems.length;

  const overallLabGrade = labsMax > 0 ? Math.round((labsTotal / labsMax) * 100) : 0;

  const courseScore = assignmentsTotal + quizzesTotal + examsTotal;
  const courseMax = assignmentsMax + quizzesMax + examsMax;
  const overallCourseGrade = courseMax > 0 ? Math.round((courseScore / courseMax) * 100) : 0;

  const totalScore = labsTotal + courseScore;
  const totalMax = labsMax + courseMax;
  const overall = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

  return {
    overallLabGrade,
    overallCourseGrade,
    labs: { score: labsTotal, total: labsMax, count: labsCount },
    assignments: { score: assignmentsTotal, total: assignmentsMax, count: assignmentsCount },
    quizzes: { score: quizzesTotal, total: quizzesMax, count: quizzesCount },
    exams: { score: examsTotal, total: examsMax, count: examsCount },
    overall,
  };
}

/**
 * Get student's recent activity
 */
export async function getStudentActivity(rollNumber: string): Promise<any[]> {
  const [labs, assignments, quizzes] = await Promise.all([
    getAllLabs(),
    getAllAssignments(),
    getAllQuizzes(),
  ]);

  const activities: any[] = [];

  // Add labs
  labs.forEach((lab) => {
    const hasSolution = lab.lab_files?.some(f => f.file_type === 'solution') && isSolutionVisible(lab);
    activities.push({
      id: `lab-${lab.id}`,
      type: 'lab' as const,
      title: `Lab ${lab.lab_number}: ${lab.title}`,
      status: hasSolution ? 'completed' as const : 'in_progress' as const,
      date: lab.taken_date || lab.created_at,
    });
  });

  // Add assignments
  assignments.forEach((assignment) => {
    const deadline = assignment.submission_deadline ? new Date(assignment.submission_deadline) : null;
    const now = new Date();
    let status: 'completed' | 'in_progress' | 'missing' = 'in_progress';
    
    if (deadline && now > deadline) {
      status = 'missing';
    }

    activities.push({
      id: `assignment-${assignment.id}`,
      type: 'assignment' as const,
      title: `Assignment ${assignment.assignment_number}: ${assignment.title}`,
      status,
      date: assignment.submission_deadline || assignment.created_at,
    });
  });

  // Add quizzes
  quizzes.forEach((quiz) => {
    activities.push({
      id: `quiz-${quiz.id}`,
      type: 'quiz' as const,
      title: `Quiz ${quiz.quiz_number}: ${quiz.title}`,
      status: quiz.status === 'completed' ? 'completed' as const : 'upcoming' as const,
      date: quiz.taken_date || quiz.scheduled_date || quiz.created_at,
    });
  });

  // Sort by date (most recent first)
  return activities.sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateB - dateA;
  }).slice(0, 5);
}

/**
 * Get upcoming deadlines
 */
export async function getUpcomingDeadlines(): Promise<any[]> {
  const [assignments, labs] = await Promise.all([
    getAllAssignments(),
    getAllLabs(),
  ]);

  const deadlines: any[] = [];
  const now = new Date();

  // Add assignment deadlines
  assignments
    .filter(a => a.submission_deadline && a.status === 'active')
    .forEach((assignment) => {
      const deadline = new Date(assignment.submission_deadline!);
      if (deadline > now) {
        const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        deadlines.push({
          id: `assignment-${assignment.id}`,
          title: `Assignment ${assignment.assignment_number}: ${assignment.title}`,
          type: 'assignment' as const,
          dueDate: deadline.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
          daysLeft,
        });
      }
    });

  // Add lab deadlines
  labs
    .filter(l => l.deadline)
    .forEach((lab) => {
      const deadline = new Date(lab.deadline!);
      if (deadline > now) {
        const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        deadlines.push({
          id: `lab-${lab.id}`,
          title: `Lab ${lab.lab_number}: ${lab.title}`,
          type: 'lab' as const,
          dueDate: deadline.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
          daysLeft,
        });
      }
    });

  // Sort by days left
  return deadlines.sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 5);
}
