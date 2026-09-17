# Google Sheets API Setup Guide

## Overview

The Programming Fundamentals Portal integrates with Google Sheets to automatically sync grade data. This requires setting up Google API credentials and a Supabase Edge Function.

## Step 1: Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Sheets API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"

## Step 2: Create Service Account (Recommended)

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Fill in the service account details
4. Click "Create and Continue"
5. Skip role assignment (or add "Editor" role)
6. Click "Done"
7. Click on the created service account
8. Go to "Keys" tab
9. Click "Add Key" > "Create new key"
10. Choose "JSON" format
11. Download the JSON key file

## Step 3: Share Google Sheet with Service Account

1. Open your Google Sheet
2. Click "Share" button
3. Add the service account email (found in the JSON key file, field: `client_email`)
4. Give it "Viewer" or "Editor" access
5. Click "Send"

## Step 4: Create Supabase Edge Function

Create a Supabase Edge Function to handle Google Sheets API calls:

### Install Supabase CLI (Windows)

**⚠️ Note**: `npm install -g supabase` does NOT work. Use one of these methods:

#### Option 1: Using Scoop (Recommended for Windows)
```powershell
# Install Scoop if you don't have it
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# Install Supabase CLI
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

#### Option 2: Using Winget (Windows 10/11)
```powershell
winget install --id=Supabase.CLI -e
```

#### Option 3: Using Chocolatey
```powershell
choco install supabase
```

#### Option 4: Direct Download
1. Go to [Supabase CLI Releases](https://github.com/supabase/cli/releases)
2. Download the Windows executable (`supabase_X.X.X_windows_amd64.zip`)
3. Extract and add to your PATH

### After Installation:

1. Verify installation: `supabase --version`
2. Login: `supabase login`
3. Link project: `supabase link --project-ref agtzjfzxwyjwxpxkvwuc`
4. Create function: `supabase functions new sync-google-sheets`

## Step 5: Edge Function Implementation

The edge function should:
- Use the service account JSON key to authenticate
- Fetch data from Google Sheets API
- Parse and cache data in Supabase
- Handle errors gracefully

## Step 6: Environment Variables

Add the service account JSON to Supabase secrets:

```bash
supabase secrets set GOOGLE_SERVICE_ACCOUNT='{"type":"service_account",...}'
```

Or store it in Supabase Dashboard > Project Settings > Edge Functions > Secrets

## Step 7: Update Frontend

Once the edge function is deployed, the frontend will automatically use it when syncing sheets.

## Alternative: OAuth 2.0 Setup

**⚠️ Important**: If you only have OAuth 2.0 credentials (for user authentication), you still need to complete these steps:

### Required Steps (Even with OAuth):

1. **Step 1: Enable Google Sheets API** ✅ **REQUIRED**
   - You MUST enable Google Sheets API in Google Cloud Console
   - This is separate from OAuth credentials

2. **Step 4: Create Supabase Edge Function** ✅ **REQUIRED**
   - You MUST create the Edge Function to handle API calls
   - The frontend cannot directly call Google Sheets API (CORS restrictions)

3. **Step 5: Implement Edge Function with OAuth** ✅ **REQUIRED**
   - The Edge Function needs to use OAuth tokens instead of Service Account
   - More complex: requires storing refresh tokens, handling token refresh
   - The admin's Google account must have access to the sheets

4. **Step 6: Store OAuth Tokens** ✅ **REQUIRED**
   - Store OAuth Client ID and Secret in Supabase secrets
   - Store user's refresh token (obtained during OAuth flow)
   - Implement token refresh logic in Edge Function

### Steps You Can Skip (If Using OAuth):

- ❌ **Step 2: Create Service Account** - Not needed if using OAu
th
- ❌ **Step 3: Share with Service Account** - Not needed; user's account needs access instead

### OAuth vs Service Account Comparison:

| Feature | Service Account (Recommended) | OAuth 2.0 |
|---------|------------------------------|-----------|
| Setup Complexity | Simple | Complex |
| User Interaction | None required | Requires permission grant |
| Token Management | Simple (JSON key) | Complex (refresh tokens) |
| Sheet Access | Share with service account email | User's account must have access |
| Best For | Automated syncing | User-specific access |

### Recommendation:

**Use Service Account** if possible - it's much simpler and doesn't require user interaction. Only use OAuth if you specifically need user-specific access or can't use Service Accounts.

### If You Must Use OAuth:

You'll need to:
1. Add Google Sheets API scopes to your OAuth consent screen: `https://www.googleapis.com/auth/spreadsheets.readonly`
2. Implement OAuth flow to get refresh token
3. Store refresh token securely in Supabase
4. Update Edge Function to use OAuth tokens instead of Service Account
5. Implement token refresh logic in Edge Function

## Testing

1. Configure a Google Sheet in the admin panel
2. Click "Sync Now"
3. Check that data appears in the grade_data table
4. Verify students can see their grades

## Troubleshooting

### "Permission denied" errors
- Ensure the service account email has access to the sheet
- Check that the sheet is shared correctly

### "API not enabled" errors
- Verify Google Sheets API is enabled in Google Cloud Console
- Check API quotas and limits

### "Invalid credentials" errors
- Verify the service account JSON is correct
- Check that secrets are properly set in Supabase
