// Google Sheets API integration utilities

import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type GradeSheet = Tables<'grade_sheets'>;
export type GradeData = Tables<'grade_data'>;

/**
 * Extract sheet ID from Google Sheets URL
 * Format: https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit
 */
export function extractSheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

/**
 * Fetch data from Google Sheets using the API
 * NOTE: This requires Google API credentials to be set up
 * You'll need to:
 * 1. Create a Google Cloud Project
 * 2. Enable Google Sheets API
 * 3. Create OAuth 2.0 credentials or Service Account
 * 4. Add credentials to environment variables
 */
export async function fetchSheetData(sheetId: string, range?: string): Promise<any[][]> {
  // This is a placeholder - actual implementation requires Google API setup
  // For now, we'll use a backend function or Edge Function to handle this
  
  // Option 1: Use Supabase Edge Function (recommended)
  // Option 2: Use direct API calls from frontend (requires CORS setup)
  
  throw new Error('Google Sheets API integration requires backend setup. Please configure Google API credentials.');
}

/**
 * Parse sheet data and extract columns
 */
export function parseSheetData(data: any[][]): {
  headers: string[];
  rows: any[][];
  rollNumberColumnIndex: number;
} {
  if (!data || data.length === 0) {
    throw new Error('Sheet data is empty');
  }

  const headers = data[0].map((h: any) => String(h || '').trim());
  const rows = data.slice(1);
  
  // Find roll number column (usually first column or named "Roll Number")
  let rollNumberColumnIndex = 0;
  const rollNumberIndex = headers.findIndex(h => 
    h.toLowerCase().includes('roll') || h.toLowerCase().includes('rollnumber')
  );
  if (rollNumberIndex !== -1) {
    rollNumberColumnIndex = rollNumberIndex;
  }

  return {
    headers,
    rows,
    rollNumberColumnIndex,
  };
}

/**
 * Get all tabs from a Google Sheet
 */
export async function getSheetTabs(sheetId: string): Promise<string[]> {
  // This would fetch tab names from Google Sheets API
  // For now, return common tab names
  return ['Assignments', 'Labs', 'Quizzes', 'Midterms', 'Finals', 'Project', 'Attendance'];
}

/**
 * Save grade sheet configuration
 */
export async function saveGradeSheetConfig(
  sheetUrl: string,
  sheetId: string,
  section: 'CS-F26-M' | 'CS-F26-A',
  tabs: Array<{
    name: string;
    columns: string[];
    visibleColumns: string[];
    rollNumberColumn: string;
  }>,
  userId: string
): Promise<GradeSheet> {
  try {
    // First, check if a row exists with this sheet_id and section
    const { data: existing, error: checkError } = await supabase
      .from('grade_sheets')
      .select('id')
      .eq('sheet_id', sheetId)
      .eq('section', section)
      .maybeSingle();

    // If check fails due to missing column, try without section
    if (checkError && (checkError.code === '42703' || checkError.message?.includes('column'))) {
      const { data: existingFallback } = await supabase
        .from('grade_sheets')
        .select('id')
        .eq('sheet_id', sheetId)
        .maybeSingle();

      if (existingFallback) {
        // Update existing (old schema, no section)
        const updateData: any = {
          sheet_url: sheetUrl,
          tabs: tabs as any,
          updated_by: userId,
          last_synced_at: new Date().toISOString(),
        };

        const { data: updateResult, error: updateError } = await supabase
          .from('grade_sheets')
          .update(updateData)
          .eq('sheet_id', sheetId)
          .select()
          .single();

        if (updateError) throw updateError;
        return updateResult;
      } else {
        // Insert new (old schema)
        const insertData: any = {
          sheet_url: sheetUrl,
          sheet_id: sheetId,
          tabs: tabs as any,
          updated_by: userId,
          last_synced_at: new Date().toISOString(),
        };

        const { data: insertResult, error: insertError } = await supabase
          .from('grade_sheets')
          .insert(insertData)
          .select()
          .single();

        if (insertError) throw insertError;
        return insertResult;
      }
    }

    // If section column exists, use it
    if (existing) {
      // Update existing
      const updateData: any = {
        sheet_url: sheetUrl,
        section: section,
        tabs: tabs as any,
        updated_by: userId,
        last_synced_at: new Date().toISOString(),
      };

      const { data: updateResult, error: updateError } = await supabase
        .from('grade_sheets')
        .update(updateData)
        .eq('sheet_id', sheetId)
        .eq('section', section)
        .select()
        .single();

      if (updateError) {
        console.error(`[saveGradeSheetConfig] Update error:`, updateError);
        throw updateError;
      }
      return updateResult;
    } else {
      // Insert new
      const insertData: any = {
        sheet_url: sheetUrl,
        sheet_id: sheetId,
        section: section,
        tabs: tabs as any,
        updated_by: userId,
        last_synced_at: new Date().toISOString(),
      };

      const { data: insertResult, error: insertError } = await supabase
        .from('grade_sheets')
        .insert(insertData)
        .select()
        .single();

      if (insertError) {
        console.error(`[saveGradeSheetConfig] Insert error:`, insertError);
        throw insertError;
      }
      return insertResult;
    }
  } catch (error: any) {
    console.error('Error saving grade sheet config:', error);
    throw error;
  }
}

/**
 * Get auto-sync enabled status for a section
 */
export async function getAutoSyncEnabled(section: 'CS-F26-M' | 'CS-F26-A'): Promise<boolean> {
  try {
    const config = await getGradeSheetConfig(section);
    return (config as any)?.auto_sync_enabled ?? false;
  } catch (error) {
    console.error('Error getting auto-sync status:', error);
    return false;
  }
}

/**
 * Set auto-sync enabled status for a section
 */
export async function setAutoSyncEnabled(
  sheetId: string,
  section: 'CS-F26-M' | 'CS-F26-A',
  enabled: boolean
): Promise<void> {
  try {
    const { error } = await supabase
      .from('grade_sheets')
      .update({ auto_sync_enabled: enabled } as any)
      .eq('sheet_id', sheetId)
      .eq('section', section);

    if (error) {
      // If column doesn't exist, provide helpful error message
      if (error.code === '42703' || error.message?.includes('column')) {
        throw new Error('auto_sync_enabled column not found. Please run migration 006_add_auto_sync_enabled.sql');
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Error setting auto-sync status:', error);
    throw error;
  }
}

/**
 * Get grade sheet configuration for a specific section
 */
export async function getGradeSheetConfig(section: 'CS-F26-M' | 'CS-F26-A'): Promise<GradeSheet | null> {
  try {
    // First try with section filter - this is the primary method
    let { data, error } = await supabase
      .from('grade_sheets')
      .select('*')
      .eq('section', section)
      .maybeSingle();

    // If no data found with section filter, try to find any config for this section
    // by checking all records and filtering by section (in case of data inconsistency)
    if (!data && error?.code === 'PGRST116') {
      // Get all grade sheets and filter by section in memory
      const { data: allSheets, error: allError } = await supabase
        .from('grade_sheets')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (!allError && allSheets) {
        // Find the one matching this section
        const matchingSheet = allSheets.find((sheet: any) => sheet.section === section);
        if (matchingSheet) {
          data = matchingSheet;
          error = null;
        }
      }
    }

    if (error) {
      // If column doesn't exist (migration not run), try without section filter
      if (error.code === '42703' || 
          error.code === '42P01' ||
          error.message?.includes('column') || 
          error.message?.includes('does not exist') ||
          error.message?.includes('undefined column')) {
        // Fallback: get any sheet (for backward compatibility)
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('grade_sheets')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (fallbackError) {
          if (fallbackError.code === 'PGRST116') {
            return null; // No rows found
          }
          console.error('Fallback query error:', fallbackError);
          return null; // Return null instead of throwing
        }
        return fallbackData;
      }
      
      if (error.code === 'PGRST116') {
        // No rows found for this section - this is normal if not configured yet
        return null;
      }
      
      // For other errors, log and return null instead of throwing
      console.error('Error fetching grade sheet config:', error);
      return null;
    }
    
    // If data is null (no rows found), return null
    if (!data) {
      return null;
    }
    
    return data;
  } catch (error: any) {
    console.error('Unexpected error in getGradeSheetConfig:', error);
    // Always return null instead of throwing to prevent app crash
    return null;
  }
}

/**
 * Get grade sheet configuration by sheet ID (more reliable than section)
 */
export async function getGradeSheetConfigById(sheetId: string): Promise<GradeSheet | null> {
  try {
    const { data, error } = await supabase
      .from('grade_sheets')
      .select('*')
      .eq('sheet_id', sheetId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching config by ID:', error);
      return null;
    }
    return data;
  } catch (error) {
    console.error('Unexpected error in getGradeSheetConfigById:', error);
    return null;
  }
}

/**
 * Get all grade sheet configurations
 */
export async function getAllGradeSheetConfigs(): Promise<GradeSheet[]> {
  const { data, error } = await supabase
    .from('grade_sheets')
    .select('*')
    .order('section', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Cache grade data from sheet
 */
export async function cacheGradeData(
  sheetId: string,
  tabName: string,
  rollNumber: string,
  data: any
): Promise<GradeData> {
  const { data: gradeData, error } = await supabase
    .from('grade_data')
    .upsert({
      sheet_id: sheetId,
      tab_name: tabName,
      roll_number: rollNumber.toLowerCase(),
      data: data as any,
      synced_at: new Date().toISOString(),
    }, {
      onConflict: 'sheet_id,tab_name,roll_number',
    })
    .select()
    .single();

  if (error) throw error;
  return gradeData;
}

/**
 * Get grade data for a student
 */
export async function getStudentGradeData(rollNumber: string): Promise<GradeData[]> {
  const { data, error } = await supabase
    .from('grade_data')
    .select('*')
    .eq('roll_number', rollNumber.toLowerCase())
    .order('tab_name', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get all grade data for a specific tab
 */
export async function getTabGradeData(sheetId: string, tabName: string): Promise<GradeData[]> {
  const { data, error } = await supabase
    .from('grade_data')
    .select('*')
    .eq('sheet_id', sheetId)
    .eq('tab_name', tabName);

  if (error) throw error;
  return data || [];
}

/**
 * Update tab visibility configuration
 */
export async function updateTabVisibility(
  sheetId: string,
  section: 'CS-F26-M' | 'CS-F26-A',
  tabName: string,
  visible: boolean
): Promise<void> {
  try {
    let query = supabase
      .from('grade_sheets')
      .select('tabs')
      .eq('sheet_id', sheetId);
    
    // Try with section filter first
    const { data: sheet, error: fetchError } = await query.eq('section', section).single();

    if (fetchError) {
      // If section column doesn't exist, try without it
      if (fetchError.code === '42703' || fetchError.message?.includes('column') || fetchError.message?.includes('does not exist')) {
        const { data: fallbackSheet, error: fallbackError } = await supabase
          .from('grade_sheets')
          .select('tabs')
          .eq('sheet_id', sheetId)
          .single();
        
        if (fallbackError) throw fallbackError;
        
        const tabs = (fallbackSheet.tabs as any[]) || [];
        const tabIndex = tabs.findIndex(t => t.name === tabName);
        
        if (tabIndex === -1) {
          throw new Error(`Tab ${tabName} not found`);
        }

        // CRITICAL: Create a deep copy to ensure Supabase detects the JSONB change
        const updatedTabs = tabs.map((tab, index) => {
          if (index === tabIndex) {
            return {
              ...tab,
              visible: visible,
            };
          }
          return tab;
        });

        const { error: updateError } = await supabase
          .from('grade_sheets')
          .update({ 
            tabs: JSON.parse(JSON.stringify(updatedTabs)) as any,
            updated_at: new Date().toISOString()
          })
          .eq('sheet_id', sheetId);

        if (updateError) throw updateError;
        return;
      }
      throw fetchError;
    }

    const tabs = (sheet.tabs as any[]) || [];
    // Match tab name case-insensitively and trimmed
    const tabIndex = tabs.findIndex(t => {
      const configTabName = (t.name || '').trim().toLowerCase();
      const searchTabName = tabName.trim().toLowerCase();
      return configTabName === searchTabName;
    });
    
    if (tabIndex === -1) {
      throw new Error(`Tab ${tabName} not found`);
    }

    // CRITICAL: Create a deep copy to ensure Supabase detects the JSONB change
    const updatedTabs = tabs.map((tab, index) => {
      if (index === tabIndex) {
        return {
          ...tab,
          visible: visible,
        };
      }
      return tab;
    });

    // CRITICAL: Use JSON.stringify to ensure Supabase detects the JSONB change
    const { error: updateError } = await supabase
      .from('grade_sheets')
      .update({ 
        tabs: JSON.parse(JSON.stringify(updatedTabs)) as any,
        updated_at: new Date().toISOString()
      })
      .eq('sheet_id', sheetId)
      .eq('section', section);

    if (updateError) {
      // If section column doesn't exist, try without it
      if (updateError.code === '42703' || updateError.message?.includes('column') || updateError.message?.includes('does not exist')) {
        const { error: fallbackError } = await supabase
          .from('grade_sheets')
          .update({ 
            tabs: JSON.parse(JSON.stringify(updatedTabs)) as any,
            updated_at: new Date().toISOString()
          })
          .eq('sheet_id', sheetId);
        
        if (fallbackError) throw fallbackError;
        return;
      }
      throw updateError;
    }
  } catch (error: any) {
    console.error('Error updating tab visibility:', error);
    throw error;
  }
}

/**
 * Update column visibility configuration
 */
export async function updateColumnVisibility(
  sheetId: string,
  section: 'CS-F26-M' | 'CS-F26-A',
  tabName: string,
  visibleColumns: string[]
): Promise<void> {
  try {
    let query = supabase
      .from('grade_sheets')
      .select('tabs')
      .eq('sheet_id', sheetId);
    
    // Try with section filter first
    const { data: sheet, error: fetchError } = await query.eq('section', section).single();

    if (fetchError) {
      // If section column doesn't exist, try without it
      if (fetchError.code === '42703' || fetchError.message?.includes('column') || fetchError.message?.includes('does not exist')) {
        const { data: fallbackSheet, error: fallbackError } = await supabase
          .from('grade_sheets')
          .select('tabs')
          .eq('sheet_id', sheetId)
          .single();
        
        if (fallbackError) throw fallbackError;
        
        const tabs = (fallbackSheet.tabs as any[]) || [];
        const tabIndex = tabs.findIndex(t => t.name === tabName);
        
        if (tabIndex === -1) {
          throw new Error(`Tab ${tabName} not found`);
        }

        // CRITICAL: Create a deep copy to ensure Supabase detects the JSONB change
        const updatedTabs = tabs.map((tab, index) => {
          if (index === tabIndex) {
            return {
              ...tab,
              visibleColumns: [...visibleColumns], // New array reference
            };
          }
          return tab;
        });

        const { error: updateError } = await supabase
          .from('grade_sheets')
          .update({ 
            tabs: JSON.parse(JSON.stringify(updatedTabs)) as any,
            updated_at: new Date().toISOString()
          })
          .eq('sheet_id', sheetId);

        if (updateError) throw updateError;
        return;
      }
      throw fetchError;
    }

    const tabs = (sheet.tabs as any[]) || [];
    // Match tab name case-insensitively and trimmed
    const tabIndex = tabs.findIndex(t => {
      const configTabName = (t.name || '').trim().toLowerCase();
      const searchTabName = tabName.trim().toLowerCase();
      return configTabName === searchTabName;
    });
    
    if (tabIndex === -1) {
      throw new Error(`Tab ${tabName} not found`);
    }

    // CRITICAL: Create a deep copy to ensure Supabase detects the JSONB change
    // Simply spreading the array isn't enough - we need to create new objects
    const updatedTabs = tabs.map((tab, index) => {
      if (index === tabIndex) {
        // Create a completely new object for the updated tab
        return {
          ...tab,
          visibleColumns: [...visibleColumns], // New array reference
        };
      }
      return tab;
    });

    // CRITICAL: Use JSON.stringify to ensure Supabase detects the JSONB change
    const { error: updateError } = await supabase
      .from('grade_sheets')
      .update({ 
        tabs: JSON.parse(JSON.stringify(updatedTabs)) as any,
        updated_at: new Date().toISOString()
      })
      .eq('sheet_id', sheetId)
      .eq('section', section);

    if (updateError) {
      // If section column doesn't exist, try without it
      if (updateError.code === '42703' || updateError.message?.includes('column') || updateError.message?.includes('does not exist')) {
        const { error: fallbackError } = await supabase
          .from('grade_sheets')
          .update({ 
            tabs: JSON.parse(JSON.stringify(updatedTabs)) as any,
            updated_at: new Date().toISOString()
          })
          .eq('sheet_id', sheetId);
        
        if (fallbackError) throw fallbackError;
        return;
      }
      throw updateError;
    }
  } catch (error: any) {
    console.error('Error updating column visibility:', error);
    throw error;
  }
}

/**
 * Sync sheet data (to be called from backend/edge function)
 * This function should be implemented in a Supabase Edge Function
 * that has access to Google API credentials
 */
export async function syncSheetData(sheetId: string): Promise<{
  success: boolean;
  tabsSynced: number;
  studentsSynced: number;
  tabs: string[];
  tabsInfo?: Array<{
    name: string;
    columns: string[];
    rollNumberColumn: string;
  }>;
}> {
  // supabase.functions.invoke automatically includes the auth token from the current session
  // The Edge Function has verify_jwt = true, so Supabase verifies the token automatically
  
  const { data, error } = await supabase.functions.invoke('sync-google-sheets', {
    body: { sheetId },
  });

  if (error) {
    console.error('Edge function error:', error);
    throw error;
  }
  return data;
}
