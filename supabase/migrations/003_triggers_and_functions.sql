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
