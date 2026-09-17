-- Programming Fundamentals Portal: run this entire file once in Supabase SQL Editor
-- Skips 005_storage_policies.sql (create buckets + run node scripts/setup-storage-policies.js instead)


-- ========== 001_initial_schema.sql ==========

-- Programming Fundamentals Portal Database Schema
-- Phase 1: Initial tables setup

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
-- This table stores additional user information
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    roll_number TEXT,
    name TEXT,
    section TEXT CHECK (section IN ('CS-F26-M', 'CS-F26-A')),
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- Enrolled students table
CREATE TABLE IF NOT EXISTS public.enrolled_students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    roll_number TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    section TEXT NOT NULL CHECK (section IN ('CS-F26-M', 'CS-F26-A')),
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admins table
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    added_by UUID REFERENCES public.users(id),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Labs table
CREATE TABLE IF NOT EXISTS public.labs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lab_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    taken_date DATE,
    deadline DATE,
    solution_visible_after TIMESTAMP WITH TIME ZONE,
    uploaded_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(lab_number)
);

-- Lab files table (for storing file references)
CREATE TABLE IF NOT EXISTS public.lab_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lab_id UUID REFERENCES public.labs(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('problem', 'solution', 'starter_code', 'dataset')),
    file_size BIGINT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assignments table
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    submission_deadline TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed')),
    uploaded_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(assignment_number)
);

-- Assignment files table
CREATE TABLE IF NOT EXISTS public.assignment_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('problem', 'solution', 'instructions')),
    file_size BIGINT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quizzes table
CREATE TABLE IF NOT EXISTS public.quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    scheduled_date DATE,
    taken_date DATE,
    status TEXT DEFAULT 'upcoming' CHECK (status IN ('completed', 'upcoming')),
    uploaded_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(quiz_number)
);

-- Quiz files table
CREATE TABLE IF NOT EXISTS public.quiz_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('problem', 'solution')),
    file_size BIGINT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Grade sheets configuration table
CREATE TABLE IF NOT EXISTS public.grade_sheets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sheet_url TEXT NOT NULL,
    sheet_id TEXT NOT NULL UNIQUE,
    sheet_name TEXT,
    tabs JSONB NOT NULL, -- Array of tab configurations
    last_synced_at TIMESTAMP WITH TIME ZONE,
    updated_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Grade data cache table
CREATE TABLE IF NOT EXISTS public.grade_data (
    sheet_id TEXT NOT NULL REFERENCES public.grade_sheets(sheet_id) ON DELETE CASCADE,
    tab_name TEXT NOT NULL,
    roll_number TEXT NOT NULL,
    data JSONB NOT NULL, -- All grade data for this student in this tab
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (sheet_id, tab_name, roll_number)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_roll_number ON public.users(roll_number);
CREATE INDEX IF NOT EXISTS idx_enrolled_students_roll_number ON public.enrolled_students(roll_number);
CREATE INDEX IF NOT EXISTS idx_enrolled_students_section ON public.enrolled_students(section);
CREATE INDEX IF NOT EXISTS idx_labs_lab_number ON public.labs(lab_number);
CREATE INDEX IF NOT EXISTS idx_assignments_assignment_number ON public.assignments(assignment_number);
CREATE INDEX IF NOT EXISTS idx_quizzes_quiz_number ON public.quizzes(quiz_number);
CREATE INDEX IF NOT EXISTS idx_grade_data_roll_number ON public.grade_data(roll_number);
CREATE INDEX IF NOT EXISTS idx_grade_data_sheet_tab ON public.grade_data(sheet_id, tab_name);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrolled_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies will be added in a separate migration after authentication is set up

-- ========== 002_rls_policies.sql ==========

-- RLS Policies for Programming Fundamentals Portal
-- Phase 1: Security policies

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE id = user_id AND is_admin = TRUE
    ) OR EXISTS (
        SELECT 1 FROM public.admins
        WHERE email = (SELECT email FROM auth.users WHERE id = user_id)
        AND is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user's roll number
CREATE OR REPLACE FUNCTION public.get_user_roll_number(user_id UUID)
RETURNS TEXT AS $$
BEGIN
    RETURN (SELECT roll_number FROM public.users WHERE id = user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users table policies
-- Users can read their own data
CREATE POLICY "Users can read own data"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own data (except is_admin)
CREATE POLICY "Users can update own data"
    ON public.users FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id AND is_admin = (SELECT is_admin FROM public.users WHERE id = auth.uid()));

-- Admins can read all users
CREATE POLICY "Admins can read all users"
    ON public.users FOR SELECT
    USING (public.is_admin(auth.uid()));

-- Enrolled students policies
-- Everyone can read enrolled students (for validation)
CREATE POLICY "Anyone can read enrolled students"
    ON public.enrolled_students FOR SELECT
    USING (true);

-- Only admins can insert/update/delete enrolled students
CREATE POLICY "Admins can manage enrolled students"
    ON public.enrolled_students FOR ALL
    USING (public.is_admin(auth.uid()));

-- Admins table policies
-- Only admins can read admins list
CREATE POLICY "Admins can read admins"
    ON public.admins FOR SELECT
    USING (public.is_admin(auth.uid()));

-- Only admins can manage admins
CREATE POLICY "Admins can manage admins"
    ON public.admins FOR ALL
    USING (public.is_admin(auth.uid()));

-- Labs policies
-- Everyone can read labs
CREATE POLICY "Anyone can read labs"
    ON public.labs FOR SELECT
    USING (true);

-- Only admins can manage labs
CREATE POLICY "Admins can manage labs"
    ON public.labs FOR ALL
    USING (public.is_admin(auth.uid()));

-- Lab files policies
-- Everyone can read lab files
CREATE POLICY "Anyone can read lab files"
    ON public.lab_files FOR SELECT
    USING (true);

-- Only admins can manage lab files
CREATE POLICY "Admins can manage lab files"
    ON public.lab_files FOR ALL
    USING (public.is_admin(auth.uid()));

-- Assignments policies
-- Everyone can read assignments
CREATE POLICY "Anyone can read assignments"
    ON public.assignments FOR SELECT
    USING (true);

-- Only admins can manage assignments
CREATE POLICY "Admins can manage assignments"
    ON public.assignments FOR ALL
    USING (public.is_admin(auth.uid()));

-- Assignment files policies
-- Everyone can read assignment files
CREATE POLICY "Anyone can read assignment files"
    ON public.assignment_files FOR SELECT
    USING (true);

-- Only admins can manage assignment files
CREATE POLICY "Admins can manage assignment files"
    ON public.assignment_files FOR ALL
    USING (public.is_admin(auth.uid()));

-- Quizzes policies
-- Everyone can read quizzes
CREATE POLICY "Anyone can read quizzes"
    ON public.quizzes FOR SELECT
    USING (true);

-- Only admins can manage quizzes
CREATE POLICY "Admins can manage quizzes"
    ON public.quizzes FOR ALL
    USING (public.is_admin(auth.uid()));

-- Quiz files policies
-- Everyone can read quiz files
CREATE POLICY "Anyone can read quiz files"
    ON public.quiz_files FOR SELECT
    USING (true);

-- Only admins can manage quiz files
CREATE POLICY "Admins can manage quiz files"
    ON public.quiz_files FOR ALL
    USING (public.is_admin(auth.uid()));

-- Grade sheets policies
-- Only admins can read and manage grade sheets
CREATE POLICY "Admins can manage grade sheets"
    ON public.grade_sheets FOR ALL
    USING (public.is_admin(auth.uid()));

-- Grade data policies
-- Students can only read their own grade data
CREATE POLICY "Students can read own grade data"
    ON public.grade_data FOR SELECT
    USING (
        roll_number = public.get_user_roll_number(auth.uid())
        OR public.is_admin(auth.uid())
    );

-- Only admins can insert/update/delete grade data
CREATE POLICY "Admins can manage grade data"
    ON public.grade_data FOR ALL
    USING (public.is_admin(auth.uid()));

-- ========== 003_triggers_and_functions.sql ==========

-- Triggers and Helper Functions
-- Phase 1: Database automation

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to all tables
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_enrolled_students_updated_at
    BEFORE UPDATE ON public.enrolled_students
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_labs_updated_at
    BEFORE UPDATE ON public.labs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at
    BEFORE UPDATE ON public.assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quizzes_updated_at
    BEFORE UPDATE ON public.quizzes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_grade_sheets_updated_at
    BEFORE UPDATE ON public.grade_sheets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function to sync user from auth.users to public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_roll_number TEXT;
    user_email TEXT;
BEGIN
    user_email := NEW.email;
    
    -- Extract roll number from email (format: rollnumber@pucit.edu.pk)
    user_roll_number := LOWER(SPLIT_PART(user_email, '@', 1));
    
    -- Insert into public.users
    INSERT INTO public.users (id, email, roll_number, name, is_admin, last_login)
    VALUES (
        NEW.id,
        user_email,
        user_roll_number,
        COALESCE(NEW.raw_user_meta_data->>'full_name', user_roll_number),
        FALSE,
        NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET last_login = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to sync new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Function to validate PUCIT email format
CREATE OR REPLACE FUNCTION public.is_valid_pucit_email(email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Regex: ^[a-z]{4}\d{2}[a-z]\d{3}@pucit\.edu\.pk$
    RETURN email ~* '^[a-z]{4}\d{2}[a-z]\d{3}@pucit\.edu\.pk$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check if user is enrolled
CREATE OR REPLACE FUNCTION public.is_user_enrolled(user_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.enrolled_students
        WHERE email = LOWER(user_email)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== 004_add_section_to_grade_sheets.sql ==========

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

-- ========== 006_add_auto_sync_enabled.sql ==========

-- Migration: Add auto_sync_enabled column to grade_sheets
-- This allows all admins to share the same auto-sync setting per section

ALTER TABLE public.grade_sheets
ADD COLUMN IF NOT EXISTS auto_sync_enabled BOOLEAN DEFAULT FALSE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_grade_sheets_auto_sync ON public.grade_sheets(section, auto_sync_enabled) WHERE auto_sync_enabled = TRUE;

-- ========== 007_allow_students_read_grade_sheets.sql ==========

-- Migration: Allow students to read grade_sheets for visibility settings
-- Students need to read grade_sheets to know which columns are visible
-- But they should NOT be able to modify the configuration

-- Add policy for students to read grade_sheets (SELECT only)
CREATE POLICY "Students can read grade sheets"
    ON public.grade_sheets FOR SELECT
    USING (true); -- All authenticated users can read grade sheet configs

-- Note: The existing "Admins can manage grade sheets" policy will still apply
-- for INSERT, UPDATE, DELETE operations, so only admins can modify configs

-- ========== 008_fix_grade_data_rls_case_insensitive.sql ==========

-- Migration: Fix grade_data RLS policy to handle case-insensitive roll number matching
-- This fixes the issue where students can't see their grades due to case sensitivity

-- Drop the existing policy
DROP POLICY IF EXISTS "Students can read own grade data" ON public.grade_data;

-- Update the helper function to return lowercase roll_number for consistency
CREATE OR REPLACE FUNCTION public.get_user_roll_number(user_id UUID)
RETURNS TEXT AS $$
BEGIN
    RETURN LOWER(COALESCE((SELECT roll_number FROM public.users WHERE id = user_id), ''));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a new policy with case-insensitive matching
-- Also handles NULL roll_number gracefully
CREATE POLICY "Students can read own grade data"
    ON public.grade_data FOR SELECT
    USING (
        -- Case-insensitive comparison (both sides are now lowercase)
        LOWER(roll_number) = public.get_user_roll_number(auth.uid())
        OR public.is_admin(auth.uid())
    );

-- ========== 009_rename_sections_to_f26.sql ==========

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
