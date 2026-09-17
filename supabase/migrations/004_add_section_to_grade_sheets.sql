-- Migration: Add section support to grade_sheets
-- Allows multiple sheets (one per section: CS-F26-M, CS-F26-A)

-- Step 1: Drop the foreign key constraint from grade_data (it depends on the unique constraint)
ALTER TABLE public.grade_data 
DROP CONSTRAINT IF EXISTS grade_data_sheet_id_fkey;

-- Step 2: Remove UNIQUE constraint on sheet_id (we'll have multiple sheets with same sheet_id but different sections)
ALTER TABLE public.grade_sheets 
DROP CONSTRAINT IF EXISTS grade_sheets_sheet_id_key;

-- Step 3: Add section column
ALTER TABLE public.grade_sheets 
ADD COLUMN IF NOT EXISTS section TEXT CHECK (section IN ('CS-F26-M', 'CS-F26-A'));

-- Step 4: Create new composite unique constraint (sheet_id + section)
ALTER TABLE public.grade_sheets
ADD CONSTRAINT grade_sheets_sheet_section_unique UNIQUE (sheet_id, section);

-- Step 5: Note: We cannot recreate the foreign key constraint because:
-- - grade_data references sheet_id only (no section column)
-- - grade_sheets can have multiple rows with same sheet_id (different sections)
-- - Foreign keys require a unique constraint on the referenced column(s)
-- We'll rely on application-level integrity for this relationship
-- The CASCADE delete behavior is handled by the application logic

-- Step 6: Create index for section lookups
CREATE INDEX IF NOT EXISTS idx_grade_sheets_section ON public.grade_sheets(section);
