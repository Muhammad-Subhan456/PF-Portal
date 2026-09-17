// Student management utilities

import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type EnrolledStudent = Tables<'enrolled_students'>;
export type EnrolledStudentInsert = TablesInsert<'enrolled_students'>;

/**
 * Parse CSV file and extract student data
 * Expected format: Roll Number,Name,Section,Email
 */
export function parseStudentsCSV(csvText: string): EnrolledStudentInsert[] {
  const lines = csvText.trim().split('\n');
  const students: EnrolledStudentInsert[] = [];

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle CSV with potential quoted values
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    
    if (values.length >= 3) {
      const rollNumber = values[0].toLowerCase();
      const name = values[1];
      const section = values[2] as 'CS-F26-M' | 'CS-F26-A';
      const email = values[3] || `${rollNumber}@pucit.edu.pk`;

      if (rollNumber && name && (section === 'CS-F26-M' || section === 'CS-F26-A')) {
        students.push({
          roll_number: rollNumber,
          name: name,
          section: section,
          email: email.toLowerCase(),
        });
      }
    }
  }

  return students;
}

/**
 * Upload students from CSV
 */
export async function uploadStudentsFromCSV(csvText: string): Promise<{
  success: boolean;
  added: number;
  errors: string[];
}> {
  const students = parseStudentsCSV(csvText);
  const errors: string[] = [];
  let added = 0;

  // Insert students in batches
  const batchSize = 50;
  for (let i = 0; i < students.length; i += batchSize) {
    const batch = students.slice(i, i + batchSize);
    
    const { data, error } = await supabase
      .from('enrolled_students')
      .upsert(batch, {
        onConflict: 'roll_number',
        ignoreDuplicates: false,
      })
      .select();

    if (error) {
      errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
    } else {
      added += data?.length || 0;
    }
  }

  return {
    success: errors.length === 0,
    added,
    errors,
  };
}

/**
 * Get all enrolled students
 */
export async function getAllStudents(): Promise<EnrolledStudent[]> {
  const { data, error } = await supabase
    .from('enrolled_students')
    .select('*')
    .order('roll_number', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get students by section
 */
export async function getStudentsBySection(section: 'CS-F26-M' | 'CS-F26-A'): Promise<EnrolledStudent[]> {
  const { data, error } = await supabase
    .from('enrolled_students')
    .select('*')
    .eq('section', section)
    .order('roll_number', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Add a single student
 */
export async function addStudent(student: EnrolledStudentInsert): Promise<EnrolledStudent> {
  const { data, error } = await supabase
    .from('enrolled_students')
    .insert(student)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Remove a student
 */
export async function removeStudent(rollNumber: string): Promise<void> {
  const { error } = await supabase
    .from('enrolled_students')
    .delete()
    .eq('roll_number', rollNumber);

  if (error) throw error;
}

/**
 * Export students to CSV
 */
export function exportStudentsToCSV(students: EnrolledStudent[]): string {
  const header = 'Roll Number,Name,Section,Email\n';
  const rows = students.map(s => 
    `"${s.roll_number}","${s.name}","${s.section}","${s.email}"`
  ).join('\n');
  return header + rows;
}

/**
 * Download CSV file
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
