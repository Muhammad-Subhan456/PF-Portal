-- Storage bucket policies for file uploads
-- 
-- ⚠️ IMPORTANT: Storage policies CANNOT be created via SQL migrations
-- because storage.objects is a system table that requires special permissions.
-- 
-- You MUST create these policies manually in the Supabase Dashboard.
-- See STORAGE_POLICIES_SETUP.md for detailed instructions.
--
-- This file is kept for documentation purposes only.

-- Drop existing policies if they exist (to allow re-running migration)
DROP POLICY IF EXISTS "Public read labs" ON storage.objects;
DROP POLICY IF EXISTS "Admin insert labs" ON storage.objects;
DROP POLICY IF EXISTS "Admin update labs" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete labs" ON storage.objects;
DROP POLICY IF EXISTS "Public read assignments" ON storage.objects;
DROP POLICY IF EXISTS "Admin insert assignments" ON storage.objects;
DROP POLICY IF EXISTS "Admin update assignments" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete assignments" ON storage.objects;
DROP POLICY IF EXISTS "Public read quizzes" ON storage.objects;
DROP POLICY IF EXISTS "Admin insert quizzes" ON storage.objects;
DROP POLICY IF EXISTS "Admin update quizzes" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete quizzes" ON storage.objects;

-- Labs bucket policies
-- Public read access
CREATE POLICY "Public read labs"
ON storage.objects FOR SELECT
USING (bucket_id = 'labs');

-- Admin insert access
CREATE POLICY "Admin insert labs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'labs' 
  AND public.is_admin(auth.uid())
);

-- Admin update access
CREATE POLICY "Admin update labs"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'labs' 
  AND public.is_admin(auth.uid())
)
WITH CHECK (
  bucket_id = 'labs' 
  AND public.is_admin(auth.uid())
);

-- Admin delete access
CREATE POLICY "Admin delete labs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'labs' 
  AND public.is_admin(auth.uid())
);

-- Assignments bucket policies
-- Public read access
CREATE POLICY "Public read assignments"
ON storage.objects FOR SELECT
USING (bucket_id = 'assignments');

-- Admin insert access
CREATE POLICY "Admin insert assignments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'assignments' 
  AND public.is_admin(auth.uid())
);

-- Admin update access
CREATE POLICY "Admin update assignments"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'assignments' 
  AND public.is_admin(auth.uid())
)
WITH CHECK (
  bucket_id = 'assignments' 
  AND public.is_admin(auth.uid())
);

-- Admin delete access
CREATE POLICY "Admin delete assignments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'assignments' 
  AND public.is_admin(auth.uid())
);

-- Quizzes bucket policies
-- Public read access
CREATE POLICY "Public read quizzes"
ON storage.objects FOR SELECT
USING (bucket_id = 'quizzes');

-- Admin insert access
CREATE POLICY "Admin insert quizzes"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'quizzes' 
  AND public.is_admin(auth.uid())
);

-- Admin update access
CREATE POLICY "Admin update quizzes"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'quizzes' 
  AND public.is_admin(auth.uid())
)
WITH CHECK (
  bucket_id = 'quizzes' 
  AND public.is_admin(auth.uid())
);

-- Admin delete access
CREATE POLICY "Admin delete quizzes"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'quizzes' 
  AND public.is_admin(auth.uid())
);
