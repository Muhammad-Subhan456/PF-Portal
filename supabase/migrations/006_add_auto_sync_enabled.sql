-- Migration: Add auto_sync_enabled column to grade_sheets
-- This allows all admins to share the same auto-sync setting per section

ALTER TABLE public.grade_sheets
ADD COLUMN IF NOT EXISTS auto_sync_enabled BOOLEAN DEFAULT FALSE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_grade_sheets_auto_sync ON public.grade_sheets(section, auto_sync_enabled) WHERE auto_sync_enabled = TRUE;
