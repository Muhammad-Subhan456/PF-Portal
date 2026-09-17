// Supabase Storage utilities

import { supabase } from '@/integrations/supabase/client';

export type FileType = 'lab' | 'assignment' | 'quiz';
export type LabFileType = 'problem' | 'solution' | 'starter_code' | 'dataset';
export type AssignmentFileType = 'problem' | 'solution' | 'instructions';
export type QuizFileType = 'problem' | 'solution';

const BUCKET_MAP: Record<FileType, string> = {
  lab: 'labs',
  assignment: 'assignments',
  quiz: 'quizzes',
};

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(
  file: File,
  fileType: FileType,
  folder: string,
  onProgress?: (progress: number) => void
): Promise<{ path: string; url: string }> {
  const bucket = BUCKET_MAP[fileType];
  const fileName = `${Date.now()}_${file.name}`;
  const filePath = `${folder}/${fileName}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw error;

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return {
    path: filePath,
    url: urlData.publicUrl,
  };
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFile(fileType: FileType, filePath: string): Promise<void> {
  const bucket = BUCKET_MAP[fileType];
  const { error } = await supabase.storage
    .from(bucket)
    .remove([filePath]);

  if (error) throw error;
}

/**
 * Get public URL for a file
 */
export function getFileUrl(fileType: FileType, filePath: string): string {
  const bucket = BUCKET_MAP[fileType];
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Download a file
 */
export async function downloadFile(fileType: FileType, filePath: string, fileName: string): Promise<void> {
  const bucket = BUCKET_MAP[fileType];
  const { data, error } = await supabase.storage
    .from(bucket)
    .download(filePath);

  if (error) throw error;

  const url = URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
