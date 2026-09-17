// Content management utilities (Labs, Assignments, Quizzes)

import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';
import { uploadFile, deleteFile, getFileUrl, type FileType } from './storage';

export type Lab = Tables<'labs'> & {
  lab_files?: Tables<'lab_files'>[];
};
export type Assignment = Tables<'assignments'> & {
  assignment_files?: Tables<'assignment_files'>[];
};
export type Quiz = Tables<'quizzes'> & {
  quiz_files?: Tables<'quiz_files'>[];
};

// ==================== LABS ====================

export async function getAllLabs(): Promise<Lab[]> {
  const { data, error } = await supabase
    .from('labs')
    .select(`
      *,
      lab_files (*)
    `)
    .order('lab_number', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getLabById(id: string): Promise<Lab | null> {
  const { data, error } = await supabase
    .from('labs')
    .select(`
      *,
      lab_files (*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createLab(
  lab: Omit<TablesInsert<'labs'>, 'id' | 'created_at' | 'updated_at' | 'uploaded_by'>,
  files: { file: File; type: 'problem' | 'solution' | 'starter_code' | 'dataset' }[],
  userId: string
): Promise<Lab> {
  // Create lab record
  const { data: labData, error: labError } = await supabase
    .from('labs')
    .insert({
      ...lab,
      uploaded_by: userId,
    })
    .select()
    .single();

  if (labError) throw labError;

  // Upload files
  if (files.length > 0 && labData) {
    const filePromises = files.map(async ({ file, type }) => {
      const { path, url } = await uploadFile(file, 'lab', `lab-${labData.lab_number}`);
      
      return supabase
        .from('lab_files')
        .insert({
          lab_id: labData.id,
          file_name: file.name,
          file_url: url,
          file_type: type,
          file_size: file.size,
        });
    });

    await Promise.all(filePromises);
  }

  return getLabById(labData.id) as Promise<Lab>;
}

export async function updateLab(
  id: string,
  updates: Partial<Tables<'labs'>>,
  newFiles?: { file: File; type: 'problem' | 'solution' | 'starter_code' | 'dataset' }[]
): Promise<Lab> {
  const { data, error } = await supabase
    .from('labs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // Upload new files if provided
  if (newFiles && newFiles.length > 0 && data) {
    const filePromises = newFiles.map(async ({ file, type }) => {
      const { path, url } = await uploadFile(file, 'lab', `lab-${data.lab_number}`);
      
      return supabase
        .from('lab_files')
        .insert({
          lab_id: id,
          file_name: file.name,
          file_url: url,
          file_type: type,
          file_size: file.size,
        });
    });

    await Promise.all(filePromises);
  }

  return getLabById(id) as Promise<Lab>;
}

export async function deleteLab(id: string): Promise<void> {
  // Get lab files first
  const { data: labFiles } = await supabase
    .from('lab_files')
    .select('file_url')
    .eq('lab_id', id);

  // Delete files from storage
  if (labFiles) {
    for (const file of labFiles) {
      const path = file.file_url.split('/').slice(-2).join('/');
      try {
        await deleteFile('lab', path);
      } catch (error) {
        console.error('Error deleting file:', error);
      }
    }
  }

  // Delete lab (cascade will delete lab_files)
  const { error } = await supabase
    .from('labs')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function deleteLabFile(fileId: string, fileUrl: string): Promise<void> {
  // Extract path from URL
  const path = fileUrl.split('/').slice(-2).join('/');
  
  // Delete from storage
  try {
    await deleteFile('lab', path);
  } catch (error) {
    console.error('Error deleting file from storage:', error);
  }

  // Delete from database
  const { error } = await supabase
    .from('lab_files')
    .delete()
    .eq('id', fileId);

  if (error) throw error;
}

// Check if solution is visible
// If solution_visible_after is null, solution is visible immediately
// If solution_visible_after is set, check if current time is past that date
export function isSolutionVisible(lab: Lab): boolean {
  // If no solution files exist, solution is not visible
  const hasSolutionFiles = lab.lab_files?.some(f => f.file_type === 'solution');
  if (!hasSolutionFiles) return false;
  
  // If solution_visible_after is not set, solution is visible immediately
  if (!lab.solution_visible_after) return true;
  
  // If solution_visible_after is set, check if current time is past that date
  return new Date() >= new Date(lab.solution_visible_after);
}

// ==================== ASSIGNMENTS ====================

export async function getAllAssignments(): Promise<Assignment[]> {
  const { data, error } = await supabase
    .from('assignments')
    .select(`
      *,
      assignment_files (*)
    `)
    .order('assignment_number', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getAssignmentById(id: string): Promise<Assignment | null> {
  const { data, error } = await supabase
    .from('assignments')
    .select(`
      *,
      assignment_files (*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createAssignment(
  assignment: Omit<TablesInsert<'assignments'>, 'id' | 'created_at' | 'updated_at' | 'uploaded_by'>,
  files: { file: File; type: 'problem' | 'solution' | 'instructions' }[],
  userId: string
): Promise<Assignment> {
  const { data: assignmentData, error: assignmentError } = await supabase
    .from('assignments')
    .insert({
      ...assignment,
      uploaded_by: userId,
    })
    .select()
    .single();

  if (assignmentError) throw assignmentError;

  if (files.length > 0 && assignmentData) {
    const filePromises = files.map(async ({ file, type }) => {
      const { path, url } = await uploadFile(file, 'assignment', `assignment-${assignmentData.assignment_number}`);
      
      return supabase
        .from('assignment_files')
        .insert({
          assignment_id: assignmentData.id,
          file_name: file.name,
          file_url: url,
          file_type: type,
          file_size: file.size,
        });
    });

    await Promise.all(filePromises);
  }

  return getAssignmentById(assignmentData.id) as Promise<Assignment>;
}

export async function updateAssignment(
  id: string,
  updates: Partial<Tables<'assignments'>>,
  newFiles?: { file: File; type: 'problem' | 'solution' | 'instructions' }[]
): Promise<Assignment> {
  const { data, error } = await supabase
    .from('assignments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  if (newFiles && newFiles.length > 0 && data) {
    const filePromises = newFiles.map(async ({ file, type }) => {
      const { path, url } = await uploadFile(file, 'assignment', `assignment-${data.assignment_number}`);
      
      return supabase
        .from('assignment_files')
        .insert({
          assignment_id: id,
          file_name: file.name,
          file_url: url,
          file_type: type,
          file_size: file.size,
        });
    });

    await Promise.all(filePromises);
  }

  return getAssignmentById(id) as Promise<Assignment>;
}

export async function deleteAssignment(id: string): Promise<void> {
  const { data: assignmentFiles } = await supabase
    .from('assignment_files')
    .select('file_url')
    .eq('assignment_id', id);

  if (assignmentFiles) {
    for (const file of assignmentFiles) {
      const path = file.file_url.split('/').slice(-2).join('/');
      try {
        await deleteFile('assignment', path);
      } catch (error) {
        console.error('Error deleting file:', error);
      }
    }
  }

  const { error } = await supabase
    .from('assignments')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function deleteAssignmentFile(fileId: string, fileUrl: string): Promise<void> {
  const path = fileUrl.split('/').slice(-2).join('/');
  
  try {
    await deleteFile('assignment', path);
  } catch (error) {
    console.error('Error deleting file from storage:', error);
  }

  const { error } = await supabase
    .from('assignment_files')
    .delete()
    .eq('id', fileId);

  if (error) throw error;
}

// ==================== QUIZZES ====================

export async function getAllQuizzes(): Promise<Quiz[]> {
  const { data, error } = await supabase
    .from('quizzes')
    .select(`
      *,
      quiz_files (*)
    `)
    .order('quiz_number', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getQuizById(id: string): Promise<Quiz | null> {
  const { data, error } = await supabase
    .from('quizzes')
    .select(`
      *,
      quiz_files (*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createQuiz(
  quiz: Omit<TablesInsert<'quizzes'>, 'id' | 'created_at' | 'updated_at' | 'uploaded_by'>,
  files: { file: File; type: 'problem' | 'solution' }[],
  userId: string
): Promise<Quiz> {
  const { data: quizData, error: quizError } = await supabase
    .from('quizzes')
    .insert({
      ...quiz,
      uploaded_by: userId,
    })
    .select()
    .single();

  if (quizError) throw quizError;

  if (files.length > 0 && quizData) {
    const filePromises = files.map(async ({ file, type }) => {
      const { path, url } = await uploadFile(file, 'quiz', `quiz-${quizData.quiz_number}`);
      
      return supabase
        .from('quiz_files')
        .insert({
          quiz_id: quizData.id,
          file_name: file.name,
          file_url: url,
          file_type: type,
          file_size: file.size,
        });
    });

    await Promise.all(filePromises);
  }

  return getQuizById(quizData.id) as Promise<Quiz>;
}

export async function updateQuiz(
  id: string,
  updates: Partial<Tables<'quizzes'>>,
  newFiles?: { file: File; type: 'problem' | 'solution' }[]
): Promise<Quiz> {
  const { data, error } = await supabase
    .from('quizzes')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  if (newFiles && newFiles.length > 0 && data) {
    const filePromises = newFiles.map(async ({ file, type }) => {
      const { path, url } = await uploadFile(file, 'quiz', `quiz-${data.quiz_number}`);
      
      return supabase
        .from('quiz_files')
        .insert({
          quiz_id: id,
          file_name: file.name,
          file_url: url,
          file_type: type,
          file_size: file.size,
        });
    });

    await Promise.all(filePromises);
  }

  return getQuizById(id) as Promise<Quiz>;
}

export async function deleteQuiz(id: string): Promise<void> {
  const { data: quizFiles } = await supabase
    .from('quiz_files')
    .select('file_url')
    .eq('quiz_id', id);

  if (quizFiles) {
    for (const file of quizFiles) {
      const path = file.file_url.split('/').slice(-2).join('/');
      try {
        await deleteFile('quiz', path);
      } catch (error) {
        console.error('Error deleting file:', error);
      }
    }
  }

  const { error } = await supabase
    .from('quizzes')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function deleteQuizFile(fileId: string, fileUrl: string): Promise<void> {
  const path = fileUrl.split('/').slice(-2).join('/');
  
  try {
    await deleteFile('quiz', path);
  } catch (error) {
    console.error('Error deleting file from storage:', error);
  }

  const { error } = await supabase
    .from('quiz_files')
    .delete()
    .eq('id', fileId);

  if (error) throw error;
}
