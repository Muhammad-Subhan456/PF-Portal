# Diagnosing Grade Visibility Issue

## Problem
Students can't see their grades. The console shows `[API Object - Hidden]` because the console sanitizer is hiding the real error.

## Root Cause
The RLS (Row Level Security) policy for `grade_data` table is doing a case-sensitive comparison between:
- `roll_number` in `grade_data` table
- `roll_number` from `users` table (via `get_user_roll_number` function)

If there's a case mismatch (e.g., "BCSF23M001" vs "bcsf23m001"), the RLS policy blocks access.

## Solution

### Step 1: Apply the Migration
Run this SQL in your Supabase SQL Editor:

```sql
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
```

Or use the migration file: `supabase/migrations/008_fix_grade_data_rls_case_insensitive.sql`

### Step 2: Verify Users Have Roll Numbers
Run this diagnostic query to check if users have roll_numbers set:

```sql
-- Check users without roll_number
SELECT id, email, roll_number, name, section
FROM public.users
WHERE roll_number IS NULL OR roll_number = '';

-- Check for case mismatches
SELECT 
    u.id,
    u.email,
    u.roll_number as user_roll_number,
    gd.roll_number as grade_data_roll_number,
    LOWER(u.roll_number) = LOWER(gd.roll_number) as matches
FROM public.users u
INNER JOIN public.grade_data gd ON LOWER(u.roll_number) = LOWER(gd.roll_number)
WHERE u.roll_number IS NOT NULL
LIMIT 10;
```

### Step 3: Fix Missing Roll Numbers (if needed)
If users are missing roll_numbers, update them:

```sql
-- Update roll_number from email for users missing it
UPDATE public.users
SET roll_number = LOWER(SPLIT_PART(email, '@', 1))
WHERE (roll_number IS NULL OR roll_number = '')
AND email LIKE '%@pucit.edu.pk';
```

### Step 4: Ensure Grade Data Uses Lowercase
Make sure all roll_numbers in `grade_data` are lowercase:

```sql
-- Check for uppercase roll_numbers in grade_data
SELECT DISTINCT roll_number
FROM public.grade_data
WHERE roll_number != LOWER(roll_number)
LIMIT 10;

-- Fix them (if any found)
UPDATE public.grade_data
SET roll_number = LOWER(roll_number)
WHERE roll_number != LOWER(roll_number);
```

### Step 5: Temporarily Disable Console Sanitizer (for debugging)
The console sanitizer has been temporarily disabled in `src/lib/consoleSanitizer.ts` to see real errors. After fixing the issue, you can re-enable it.

### Step 6: Test
1. Have a student log in
2. Check the browser console - you should now see the actual error (not `[API Object - Hidden]`)
3. Verify grades are visible

## Additional Checks

### Check RLS Policies Are Active
```sql
-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'grade_data';
```

### Check if Policy Exists
```sql
-- List all policies on grade_data
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'grade_data';
```

### Test RLS Policy Manually
```sql
-- Test as a specific user (replace USER_ID with actual user ID)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'USER_ID_HERE';
SELECT * FROM public.grade_data LIMIT 1;
```

## After Fixing

1. **Re-enable console sanitizer** in `src/lib/consoleSanitizer.ts`:
   ```typescript
   if (!isProduction) {
     return; // Don't sanitize in development
   }
   ```

2. **Redeploy to Vercel** if you made code changes

3. **Monitor** for any remaining issues
