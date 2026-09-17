-- Migration: Allow students to read grade_sheets for visibility settings
-- Students need to read grade_sheets to know which columns are visible
-- But they should NOT be able to modify the configuration

-- Add policy for students to read grade_sheets (SELECT only)
CREATE POLICY "Students can read grade sheets"
    ON public.grade_sheets FOR SELECT
    USING (true); -- All authenticated users can read grade sheet configs

-- Note: The existing "Admins can manage grade sheets" policy will still apply
-- for INSERT, UPDATE, DELETE operations, so only admins can modify configs
