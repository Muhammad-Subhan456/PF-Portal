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
