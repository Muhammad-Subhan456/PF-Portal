// Ranking system - calculates student rank within their section

import { supabase } from '@/integrations/supabase/client';
import { getStudentStats } from './studentData';
import { getStudentGradeData, getGradeSheetConfig } from './googleSheets';

export interface StudentRank {
  rollNumber: string;
  name: string;
  overallLabGrade: number;
  overallCourseGrade: number;
  overall: number;
  rank: number;
  section: 'CS-F26-M' | 'CS-F26-A';
}

/**
 * Get student rank within their section
 */
export async function getStudentRank(
  rollNumber: string,
  section: 'CS-F26-M' | 'CS-F26-A'
): Promise<number | null> {
  try {
    // Get all students in the section
    const { data: students, error } = await supabase
      .from('enrolled_students')
      .select('roll_number, name')
      .eq('section', section) as { data: { roll_number: string; name: string }[] | null, error: any };

    if (error) throw error;
    if (!students || students.length === 0) return null;

    // If only one student enrolled, they are rank 1 (even without grades)
    if (students.length === 1 && students[0].roll_number === rollNumber) {
      return 1;
    }

    // Calculate stats for all students
    const studentStats = await Promise.all(
      students.map(async (student) => {
        try {
          const stats = await getStudentStats(student.roll_number, section);
          // Include all students who have at least attempted labs (overallLabGrade >= 0)
          // We use >= 0 so even if they got 0%, they are part of the class ranking
          // Include students with at least 1 lab (removed the >= 2 requirement)
          if (stats.overallLabGrade >= 0 && stats.labs.count >= 1) {
            return {
              rollNumber: student.roll_number,
              name: student.name,
              overallLabGrade: stats.overallLabGrade,
              overallCourseGrade: stats.overallCourseGrade,
              overall: stats.overall,
            };
          }
          return null;
        } catch (error) {
          console.error(`Error getting stats for ${student.roll_number}:`, error);
          return null;
        }
      })
    );

    // Filter out null values (students with no grades)
    const validStats = studentStats.filter(s => s !== null) as Array<{
      rollNumber: string;
      name: string;
      overallLabGrade: number;
      overallCourseGrade: number;
      overall: number;
    }>;

    // If no students have grades yet, return null
    if (validStats.length === 0) {
      return null;
    }

    // Sort by overallLabGrade (lab marks only) - matching student dashboard
    validStats.sort((a, b) => b.overallLabGrade - a.overallLabGrade);

    // Find rank (1-based) - only among students with grades
    const rank = validStats.findIndex(s => s.rollNumber === rollNumber) + 1;
    
    // If only one student with grades, they are rank 1
    if (validStats.length === 1 && validStats[0].rollNumber === rollNumber) {
      return 1;
    }
    
    return rank > 0 ? rank : null;
  } catch (error) {
    console.error('Error calculating rank:', error);
    return null;
  }
}

/**
 * Get top rankers from both sections
 */
export async function getTopRankers(limit: number = 5): Promise<{
  morning: StudentRank[];
  afternoon: StudentRank[];
}> {
  try {
    // Get all students from both sections
    const { data: morningStudents, error: morningError } = await supabase
      .from('enrolled_students')
      .select('roll_number, name')
      .eq('section', 'CS-F26-M') as { data: { roll_number: string; name: string }[] | null, error: any };

    const { data: afternoonStudents, error: afternoonError } = await supabase
      .from('enrolled_students')
      .select('roll_number, name')
      .eq('section', 'CS-F26-A') as { data: { roll_number: string; name: string }[] | null, error: any };

    if (morningError) throw morningError;
    if (afternoonError) throw afternoonError;

    // Calculate stats for all students in both sections
    const morningStats = await Promise.all(
      (morningStudents || []).map(async (student) => {
        try {
          const stats = await getStudentStats(student.roll_number, 'CS-F26-M');
          // Include all students who have at least attempted labs (overallLabGrade >= 0)
          // Include students with at least 1 lab (removed the >= 2 requirement)
          if (stats.overallLabGrade >= 0 && stats.labs.count >= 1) {
            return {
              rollNumber: student.roll_number,
              name: student.name,
              overallLabGrade: stats.overallLabGrade,
              overallCourseGrade: stats.overallCourseGrade,
              overall: stats.overall,
              section: 'CS-F26-M' as const,
            };
          }
          return null;
        } catch (error) {
          console.error(`Error getting stats for ${student.roll_number}:`, error);
          return null;
        }
      })
    );

    const afternoonStats = await Promise.all(
      (afternoonStudents || []).map(async (student) => {
        try {
          const stats = await getStudentStats(student.roll_number, 'CS-F26-A');
          // Include all students who have at least attempted labs (overallLabGrade >= 0)
          // Include students with at least 1 lab (removed the >= 2 requirement)
          if (stats.overallLabGrade >= 0 && stats.labs.count >= 1) {
            return {
              rollNumber: student.roll_number,
              name: student.name,
              overallLabGrade: stats.overallLabGrade,
              overallCourseGrade: stats.overallCourseGrade,
              overall: stats.overall,
              section: 'CS-F26-A' as const,
            };
          }
          return null;
        } catch (error) {
          console.error(`Error getting stats for ${student.roll_number}:`, error);
          return null;
        }
      })
    );

    // Filter out null values and sort by overallLabGrade (lab marks only) - matching student dashboard
    const validMorningStats = morningStats
      .filter(s => s !== null) as StudentRank[];
    const validAfternoonStats = afternoonStats
      .filter(s => s !== null) as StudentRank[];

    validMorningStats.sort((a, b) => b.overallLabGrade - a.overallLabGrade);
    validAfternoonStats.sort((a, b) => b.overallLabGrade - a.overallLabGrade);

    // Assign ranks
    validMorningStats.forEach((stat, index) => {
      stat.rank = index + 1;
    });
    validAfternoonStats.forEach((stat, index) => {
      stat.rank = index + 1;
    });

    // Return top N from each section
    return {
      morning: validMorningStats.slice(0, limit),
      afternoon: validAfternoonStats.slice(0, limit),
    };
  } catch (error) {
    console.error('Error getting top rankers:', error);
    return { morning: [], afternoon: [] };
  }
}
