-- Storage bucket RLS policies for Programming Fundamentals Portal
-- Prerequisites: buckets labs, assignments, quizzes already exist
-- Run in Supabase SQL Editor (as project owner)

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

CREATE POLICY "Public read labs"
ON storage.objects FOR SELECT
USING (bucket_id = 'labs');

CREATE POLICY "Admin insert labs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'labs' AND public.is_admin(auth.uid()));

CREATE POLICY "Admin update labs"
ON storage.objects FOR UPDATE
USING (bucket_id = 'labs' AND public.is_admin(auth.uid()))
WITH CHECK (bucket_id = 'labs' AND public.is_admin(auth.uid()));

CREATE POLICY "Admin delete labs"
ON storage.objects FOR DELETE
USING (bucket_id = 'labs' AND public.is_admin(auth.uid()));

CREATE POLICY "Public read assignments"
ON storage.objects FOR SELECT
USING (bucket_id = 'assignments');

CREATE POLICY "Admin insert assignments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'assignments' AND public.is_admin(auth.uid()));

CREATE POLICY "Admin update assignments"
ON storage.objects FOR UPDATE
USING (bucket_id = 'assignments' AND public.is_admin(auth.uid()))
WITH CHECK (bucket_id = 'assignments' AND public.is_admin(auth.uid()));

CREATE POLICY "Admin delete assignments"
ON storage.objects FOR DELETE
USING (bucket_id = 'assignments' AND public.is_admin(auth.uid()));

CREATE POLICY "Public read quizzes"
ON storage.objects FOR SELECT
USING (bucket_id = 'quizzes');

CREATE POLICY "Admin insert quizzes"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'quizzes' AND public.is_admin(auth.uid()));

CREATE POLICY "Admin update quizzes"
ON storage.objects FOR UPDATE
USING (bucket_id = 'quizzes' AND public.is_admin(auth.uid()))
WITH CHECK (bucket_id = 'quizzes' AND public.is_admin(auth.uid()));

CREATE POLICY "Admin delete quizzes"
ON storage.objects FOR DELETE
USING (bucket_id = 'quizzes' AND public.is_admin(auth.uid()));
