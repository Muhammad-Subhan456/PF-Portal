# Storage Bucket Policies Setup

Storage policies in Supabase cannot be created via SQL migrations because the `storage.objects` table is a system table. You have two options:

## Option 1: Automated Script (Recommended)

1. Get your **Service Role Key**:
   - Go to Supabase Dashboard > **Settings** > **API**
   - Copy the **service_role** key (⚠️ Keep it secret!)

2. Set the environment variable:
   ```bash
   # Windows PowerShell
   $env:SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"
   
   # Windows CMD
   set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   
   # Linux/Mac
   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"
   ```

3. Run the script:
   ```bash
   node scripts/setup-storage-policies.js
   ```

## Option 2: Manual Setup via Dashboard

If the script doesn't work, create policies manually:

### For each bucket (`labs`, `assignments`, `quizzes`):

1. Go to **Storage** > Select bucket (e.g., `labs`)
2. Click **Policies** tab
3. Click **New Policy**

#### Policy 1: Public Read
- **Policy name**: `Public read [bucket-name]`
- **Allowed operation**: `SELECT` only
- **Target roles**: Select `anon` and `authenticated`
- **Policy definition**: `true`
- Click **Save**

#### Policy 2: Admin Insert
- **Policy name**: `Admin insert [bucket-name]`
- **Allowed operation**: `INSERT` only
- **Target roles**: Select `authenticated` only
- **Policy definition**: `public.is_admin(auth.uid())`
- Click **Save**

#### Policy 3: Admin Update
- **Policy name**: `Admin update [bucket-name]`
- **Allowed operation**: `UPDATE` only
- **Target roles**: Select `authenticated` only
- **Policy definition**: `public.is_admin(auth.uid())`
- Click **Save**

#### Policy 4: Admin Delete
- **Policy name**: `Admin delete [bucket-name]`
- **Allowed operation**: `DELETE` only
- **Target roles**: Select `authenticated` only
- **Policy definition**: `public.is_admin(auth.uid())`
- Click **Save**

Repeat for `assignments` and `quizzes` buckets.

## Verification

After setting up policies, try uploading a file in the admin panel. You should no longer see 400 errors.
