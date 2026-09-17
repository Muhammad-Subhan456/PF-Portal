# Fix OAuth Redirect Issue on Localhost

## Problem
When running locally on `localhost:8080`, after Google OAuth login, you're being redirected to the production Vercel URL instead of staying on localhost.

## Root Cause
This happens when Supabase Dashboard's "Site URL" setting is configured with the production URL. Supabase may use this setting instead of the `redirectTo` parameter in some cases.

## Solution

### Step 1: Update Supabase Dashboard Settings

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/agtzjfzxwyjwxpxkvwuc
2. Navigate to **Authentication** > **URL Configuration**
3. Update the **Site URL** field:
   - For local development: `http://localhost:8080`
   - For production: `https://dsa-portal-cs.vercel.app` (or your production URL)
4. In the **Redirect URLs** section, make sure both are added:
   - `http://localhost:8080/auth/callback`
   - `https://dsa-portal-cs.vercel.app/auth/callback` (or your production callback URL)
5. Click **Save**

### Step 2: Update Google Cloud Console (if needed)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Find your OAuth 2.0 Client ID
4. In **Authorized redirect URIs**, ensure both are present:
   - `https://agtzjfzxwyjwxpxkvwuc.supabase.co/auth/v1/callback`
   - `http://localhost:8080/auth/callback` (if you're using a custom callback)

### Step 3: Verify Code Configuration

The code already uses `window.location.origin` dynamically, so it should work correctly. However, if you still experience issues:

1. Clear your browser's localStorage:
   ```javascript
   // In browser console
   localStorage.clear();
   ```
2. Clear browser cache and cookies for localhost
3. Restart your development server:
   ```bash
   npm run dev
   ```

### Step 4: Test

1. Navigate to `http://localhost:8080/login`
2. Click "Continue with Google"
3. After authentication, you should be redirected back to `http://localhost:8080/auth/callback`
4. Then redirected to `http://localhost:8080/admin` (if admin) or `http://localhost:8080` (if student)

## Alternative: Use Different Supabase Projects

If you need to maintain separate configurations for local and production:

1. Create a separate Supabase project for local development
2. Update your `.env` file with the local project's URL and keys
3. Keep production `.env` for deployment

## Troubleshooting

### Still redirecting to production URL?

1. **Check browser console** for any errors or warnings
2. **Check Network tab** to see what redirect URL is being used
3. **Verify environment variables** - make sure `.env` file exists and has correct values
4. **Check Supabase logs** in Dashboard > Logs > Auth Logs

### Getting "redirect_uri_mismatch" error?

- Make sure the redirect URI in Google Cloud Console matches exactly what's in Supabase
- For Supabase, the redirect URI should be: `https://[your-project-ref].supabase.co/auth/v1/callback`
- The `redirectTo` parameter in code is where Supabase redirects AFTER authentication

## Notes

- The `redirectTo` parameter in `signInWithOAuth` tells Supabase where to redirect AFTER the OAuth flow completes
- Supabase's Site URL setting is used as a fallback if `redirectTo` is not provided or invalid
- Always ensure both localhost and production URLs are in the allowed redirect URLs list
