// Ranking cache system - pre-calculates and caches student ranks for fast access

import { supabase } from '@/integrations/supabase/client';
import { getStudentStats } from './studentData';

interface RankCache {
  [rollNumber: string]: number | null; // rollNumber -> rank
}

interface SectionRankCache {
  data: RankCache;
  timestamp: number;
  section: 'CS-F26-M' | 'CS-F26-A';
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const CACHE_KEY_PREFIX = 'student_ranks_';

/**
 * Calculate ranks for all students in a section and cache them
 */
export async function calculateAndCacheSectionRanks(section: 'CS-F26-M' | 'CS-F26-A'): Promise<RankCache> {
  try {
    // Get all students in the section
    const { data: students, error } = await supabase
      .from('enrolled_students')
      .select('roll_number, name')
      .eq('section', section) as { data: { roll_number: string; name: string }[] | null, error: any };

    if (error) throw error;
    if (!students || students.length === 0) return {};

    // If only one student, they are rank 1
    if (students.length === 1) {
      return { [students[0].roll_number]: 1 };
    }

    // Calculate stats for all students in parallel
    const studentStats = await Promise.all(
      students.map(async (student) => {
        try {
          const stats = await getStudentStats(student.roll_number, section);
          if (stats.overallLabGrade >= 0 && stats.labs.count >= 1) {
            return {
              rollNumber: student.roll_number,
              name: student.name,
              overallLabGrade: stats.overallLabGrade,
            };
          }
          return null;
        } catch (error) {
          console.error(`Error getting stats for ${student.roll_number}:`, error);
          return null;
        }
      })
    );

    // Filter out null values
    const validStats = studentStats.filter(s => s !== null) as Array<{
      rollNumber: string;
      name: string;
      overallLabGrade: number;
    }>;

    if (validStats.length === 0) {
      return {};
    }

    // Sort by overallLabGrade (descending)
    validStats.sort((a, b) => b.overallLabGrade - a.overallLabGrade);

    // Create rank cache
    const rankCache: RankCache = {};
    validStats.forEach((stat, index) => {
      rankCache[stat.rollNumber] = index + 1;
    });

    // Store in sessionStorage
    const cacheData: SectionRankCache = {
      data: rankCache,
      timestamp: Date.now(),
      section,
    };
    sessionStorage.setItem(`${CACHE_KEY_PREFIX}${section}`, JSON.stringify(cacheData));

    return rankCache;
  } catch (error) {
    console.error('Error calculating section ranks:', error);
    return {};
  }
}

/**
 * Get cached rank for a student, or calculate if cache is missing/stale
 */
export async function getCachedStudentRank(
  rollNumber: string,
  section: 'CS-F26-M' | 'CS-F26-A'
): Promise<number | null> {
  try {
    // Check cache first
    const cacheKey = `${CACHE_KEY_PREFIX}${section}`;
    const cached = sessionStorage.getItem(cacheKey);

    if (cached) {
      try {
        const cacheData: SectionRankCache = JSON.parse(cached);
        const age = Date.now() - cacheData.timestamp;

        // If cache is fresh, use it
        if (age < CACHE_DURATION && cacheData.section === section) {
          return cacheData.data[rollNumber] ?? null;
        }
      } catch (e) {
        // Invalid cache, recalculate
        console.error('Error parsing rank cache:', e);
      }
    }

    // Cache missing or stale, calculate for entire section
    const rankCache = await calculateAndCacheSectionRanks(section);
    return rankCache[rollNumber] ?? null;
  } catch (error) {
    console.error('Error getting cached rank:', error);
    return null;
  }
}

/**
 * Pre-calculate and cache ranks for a section (call this in background)
 */
export async function preloadSectionRanks(section: 'CS-F26-M' | 'CS-F26-A'): Promise<void> {
  // Check if cache exists and is fresh
  const cacheKey = `${CACHE_KEY_PREFIX}${section}`;
  const cached = sessionStorage.getItem(cacheKey);

  if (cached) {
    try {
      const cacheData: SectionRankCache = JSON.parse(cached);
      const age = Date.now() - cacheData.timestamp;

      // If cache is fresh, no need to recalculate
      if (age < CACHE_DURATION && cacheData.section === section) {
        return;
      }
    } catch (e) {
      // Invalid cache, recalculate
    }
  }

  // Calculate in background (don't await)
  calculateAndCacheSectionRanks(section).catch(error => {
    console.error('Error preloading ranks:', error);
  });
}

/**
 * Pre-calculate and cache ranks for both sections
 */
export async function preloadAllRanks(): Promise<void> {
  // Calculate both sections in parallel
  await Promise.all([
    preloadSectionRanks('CS-F26-M'),
    preloadSectionRanks('CS-F26-A'),
  ]);
}

/**
 * Invalidate cache for a section (call when grades are updated)
 */
export function invalidateRankCache(section?: 'CS-F26-M' | 'CS-F26-A'): void {
  if (section) {
    sessionStorage.removeItem(`${CACHE_KEY_PREFIX}${section}`);
  } else {
    // Invalidate both
    sessionStorage.removeItem(`${CACHE_KEY_PREFIX}CS-F26-M`);
    sessionStorage.removeItem(`${CACHE_KEY_PREFIX}CS-F26-A`);
  }
}
