-- Rename course sections from CS-F24-* to CS-F26-*
-- Run this in Supabase SQL Editor if you already applied older migrations.

-- Drop old check constraints (names may vary; drop by finding them)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_section_check;
ALTER TABLE public.enrolled_students DROP CONSTRAINT IF EXISTS enrolled_students_section_check;
ALTER TABLE public.grade_sheets DROP CONSTRAINT IF EXISTS grade_sheets_section_check;

-- Migrate existing rows
UPDATE public.users SET section = 'CS-F26-M' WHERE section = 'CS-F24-M';
UPDATE public.users SET section = 'CS-F26-A' WHERE section = 'CS-F24-A';
UPDATE public.enrolled_students SET section = 'CS-F26-M' WHERE section = 'CS-F24-M';
UPDATE public.enrolled_students SET section = 'CS-F26-A' WHERE section = 'CS-F24-A';
UPDATE public.grade_sheets SET section = 'CS-F26-M' WHERE section = 'CS-F24-M';
UPDATE public.grade_sheets SET section = 'CS-F26-A' WHERE section = 'CS-F24-A';

-- Re-add checks for F26
ALTER TABLE public.users
  ADD CONSTRAINT users_section_check CHECK (section IS NULL OR section IN ('CS-F26-M', 'CS-F26-A'));

ALTER TABLE public.enrolled_students
  ADD CONSTRAINT enrolled_students_section_check CHECK (section IN ('CS-F26-M', 'CS-F26-A'));

ALTER TABLE public.grade_sheets
  ADD CONSTRAINT grade_sheets_section_check CHECK (section IS NULL OR section IN ('CS-F26-M', 'CS-F26-A'));
