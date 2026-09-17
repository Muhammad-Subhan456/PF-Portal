-- Option A (recommended): run BEFORE first Google login so RLS treats you as admin immediately.
-- Option B: run AFTER first login, then sign out and sign in again.
-- Replace YOUR_EMAIL@example.com and Your Name.

INSERT INTO public.admins (email, name, is_active)
VALUES ('sbhnamir456@gmail.com', 'Muhammad Subhan', TRUE)
ON CONFLICT (email) DO UPDATE SET is_active = TRUE, name = EXCLUDED.name;

-- After you have signed in once (public.users row exists), also run:
UPDATE public.users
SET is_admin = TRUE
WHERE email = 'YOUR_EMAIL@example.com';

-- Optional: enroll yourself as a student (section must be CS-F26-M or CS-F26-A)
INSERT INTO public.enrolled_students (roll_number, name, section, email)
VALUES ('owner001', 'Your Name', 'CS-F26-A', 'YOUR_EMAIL@example.com')
ON CONFLICT (roll_number) DO NOTHING;
