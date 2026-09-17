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
