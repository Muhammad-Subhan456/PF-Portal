# Quick Start Guide

## Prerequisites

1. Node.js installed (v18+)
2. Supabase project: `agtzjfzxwyjwxpxkvwuc`
3. Google Cloud account (for OAuth and Sheets API)

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Environment Setup

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=https://agtzjfzxwyjwxpxkvwuc.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable__ig_hbDs0AaBg09GKDo6zQ_xeovbrtP
```

## Step 3: Database Setup

1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/agtzjfzxwyjwxpxkvwuc
2. Navigate to SQL Editor
3. Run migrations in order:
   - Copy and run `supabase/migrations/001_initial_schema.sql`
   - Copy and run `supabase/migrations/002_rls_policies.sql`
   - Copy and run `supabase/migrations/003_triggers_and_functions.sql`

## Step 4: Storage Setup

1. Go to Storage in Supabase Dashboard
2. Create buckets:
   - `labs` (public read, authenticated write)
   - `assignments` (public read, authenticated write)
   - `quizzes` (public read, authenticated write)

## Step 5: Google OAuth Setup

1. Go to Authentication > Providers in Supabase Dashboard
2. Enable Google provider
3. Follow instructions in `SUPABASE_SETUP.md` for OAuth credentials

## Step 6: Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:8080`

## Step 7: Create First Admin

1. Sign in with a PUCIT email via Google OAuth
2. Go to Supabase SQL Editor
3. Run:
```sql
UPDATE public.users
SET is_admin = TRUE
WHERE email = 'your-email@pucit.edu.pk';

INSERT INTO public.admins (email, name, is_active)
VALUES ('your-email@pucit.edu.pk', 'Your Name', TRUE)
ON CONFLICT (email) DO UPDATE SET is_active = TRUE;
```

4. Add yourself to enrolled_students:
```sql
INSERT INTO public.enrolled_students (roll_number, name, section, email)
VALUES ('yourrollnumber', 'Your Name', 'A', 'your-email@pucit.edu.pk')
ON CONFLICT (roll_number) DO NOTHING;
```

## Step 8: Test the Application

1. Login as student
2. Login as admin (use the admin email you set up)
3. Upload enrolled students CSV
4. Create a lab with file upload
5. Configure Google Sheets (see `GOOGLE_SHEETS_SETUP.md`)

## Troubleshooting

### "Module not found" errors
- Run `npm install` again
- Delete `node_modules` and reinstall

### Authentication errors
- Check `.env` file exists and has correct values
- Verify Google OAuth is enabled in Supabase
- Check redirect URIs are correct

### Database errors
- Ensure all migrations are applied
- Check RLS policies are active
- Verify user has correct permissions

### File upload errors
- Verify storage buckets exist
- Check bucket policies allow uploads
- Ensure user is authenticated as admin
