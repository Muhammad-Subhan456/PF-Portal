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
