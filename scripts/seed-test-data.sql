-- Seed data for local QA (Workflow A/B).
-- Run in Supabase SQL Editor after schema migrations.
-- Replace student emails with real PUCIT Google accounts you can sign in with.
-- Admin: use scripts/promote-admin.sql separately.

INSERT INTO public.enrolled_students (roll_number, name, section, email)
VALUES (
  'bcsf26m001',
  'Test Student M',
  'CS-F26-M',
  'bcsf26m001@pucit.edu.pk'
)
ON CONFLICT (roll_number) DO UPDATE SET
  name = EXCLUDED.name,
  section = EXCLUDED.section,
  email = EXCLUDED.email;

INSERT INTO public.enrolled_students (roll_number, name, section, email)
VALUES (
  'bcsf26a001',
  'Test Student A',
  'CS-F26-A',
  'bcsf26a001@pucit.edu.pk'
)
ON CONFLICT (roll_number) DO UPDATE SET
  name = EXCLUDED.name,
  section = EXCLUDED.section,
  email = EXCLUDED.email;

INSERT INTO public.labs (lab_number, title, description, taken_date, deadline)
SELECT
  1,
  'Lab 1 - Getting Started',
  'Seed lab for Programming Fundamentals portal testing.',
  CURRENT_DATE,
  CURRENT_DATE + 7
WHERE NOT EXISTS (SELECT 1 FROM public.labs WHERE lab_number = 1);

INSERT INTO public.assignments (assignment_number, title, description, submission_deadline, status)
SELECT
  1,
  'Assignment 1 - Basics',
  'Seed assignment for portal testing.',
  NOW() + INTERVAL '14 days',
  'active'
WHERE NOT EXISTS (SELECT 1 FROM public.assignments WHERE assignment_number = 1);

INSERT INTO public.quizzes (quiz_number, title, description, scheduled_date, status)
SELECT
  1,
  'Quiz 1 - Intro',
  'Seed quiz for portal testing.',
  CURRENT_DATE + 3,
  'upcoming'
WHERE NOT EXISTS (SELECT 1 FROM public.quizzes WHERE quiz_number = 1);
