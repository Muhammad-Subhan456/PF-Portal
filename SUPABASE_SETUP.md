# Supabase Setup Guide

## Database Setup

### 1. Apply Migrations

Run the following migrations in order in your Supabase SQL Editor:

1. `supabase/migrations/001_initial_schema.sql` - Creates all tables
2. `supabase/migrations/002_rls_policies.sql` - Sets up Row Level Security policies
3. `supabase/migrations/003_triggers_and_functions.sql` - Creates triggers and helper functions

### 2. Configure Google OAuth

#### Step 1: Enable Google Provider in Supabase

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/agtzjfzxwyjwxpxkvwuc
2. Navigate to **Authentication** > **Providers**
3. Find **Google** in the list and click **Enable**
4. **IMPORTANT**: Leave the Client ID and Secret fields empty for now - you'll add them after creating credentials in Google Cloud Console

#### Step 2: Create OAuth Credentials in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. If prompted, configure the OAuth consent screen first:
   - Choose **External** user type
   - Fill in required fields (App name, User support email, Developer contact)
   - Add scopes: `email`, `profile`, `openid`
   - Save and continue
6. For Application type, select **Web application**
7. Configure the OAuth client:
   - **Name**: Programming Fundamentals Portal (or any name you prefer)
   - **Authorized JavaScript origins** (add these):
     ```
     https://agtzjfzxwyjwxpxkvwuc.supabase.co
     http://localhost:8080
     ```
   - **Authorized redirect URIs** (add these):
     ```
     https://agtzjfzxwyjwxpxkvwuc.supabase.co/auth/v1/callback
     http://localhost:8080/auth/callback
     ```
8. Click **Create**
9. Copy the **Client ID** and **Client Secret**

#### Step 3: Add Credentials to Supabase

1. Go back to Supabase Dashboard > **Authentication** > **Providers** > **Google**
2. Paste the **Client ID** and **Client Secret** from Google Cloud Console
3. Click **Save**

**Note**: Make sure you've enabled the Google provider in Supabase BEFORE trying to use it, otherwise you'll get the error: `"Unsupported provider: provider is not enabled"`

### 3. Environment Variables

Create a `.env` file in the root directory (already created, but verify):

```env
VITE_SUPABASE_URL=https://agtzjfzxwyjwxpxkvwuc.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable__ig_hbDs0AaBg09GKDo6zQ_xeovbrtP
```

### 4. Storage Buckets Setup

Create storage buckets for file uploads:

1. Go to **Storage** in Supabase Dashboard
2. Create buckets:
   - `labs` - For lab files
   - `assignments` - For assignment files
   - `quizzes` - For quiz files
3. Set bucket policies:
   - Public read access for all buckets
   - Write access only for authenticated admins

### 5. Create First Admin

After setting up authentication, you'll need to manually create the first admin:

1. Sign in with a Google account that has a valid PUCIT email (e.g., `bcsf23m023@pucit.edu.pk`)
2. Run this SQL in Supabase SQL Editor (replace with your actual email and details):

```sql
-- Step 1: Make user an admin in users table
UPDATE public.users
SET is_admin = TRUE
WHERE email = 'bcsf23m023@pucit.edu.pk';

-- Step 2: Add to admins table
INSERT INTO public.admins (id, email, name, is_active)
SELECT id, email, name, TRUE
FROM public.users
WHERE email = 'bcsf23m023@pucit.edu.pk'
ON CONFLICT (id) DO UPDATE SET is_active = TRUE;

-- Step 3: Also add to enrolled_students (recommended for data consistency)
-- Extract roll number from email (bcsf23m023@pucit.edu.pk -> bcsf23m023)
INSERT INTO public.enrolled_students (roll_number, name, section, email)
VALUES (
  'bcsf23m023',  -- Your roll number
  'Your Name',   -- Your name
  'CS-F26-M',    -- Your section (CS-F26-M or CS-F26-A)
  'bcsf23m023@pucit.edu.pk'
)
ON CONFLICT (roll_number) DO NOTHING;
```

**Note**: Admins can now access the portal even if they're not in `enrolled_students`, but it's recommended to add them for data consistency.

## Testing

1. Start the development server: `npm run dev`
2. Navigate to `/login`
3. Click "Continue with Google"
4. Sign in with a PUCIT email
5. You should be redirected to the dashboard

## Troubleshooting

### "You are not enrolled in this course"
- **For Admins**: Make sure you've:
  1. Set `is_admin = TRUE` in the `users` table
  2. Added your email to the `admins` table with `is_active = TRUE`
  - Admins can access the portal even without being in `enrolled_students`
- **For Students**: Add the student email to `enrolled_students` table
- Or use the admin panel to upload a CSV of enrolled students
- **Check email case**: Make sure the email in the database matches exactly (lowercase recommended)

### Google OAuth not working
- Verify redirect URIs are correctly configured
- Check that Google OAuth is enabled in Supabase
- Verify Client ID and Secret are correct

### RLS Policy Errors
- Ensure all migrations have been applied
- Check that user is authenticated
- Verify RLS is enabled on all tables
