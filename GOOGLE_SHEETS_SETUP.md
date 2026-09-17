# Google Sheets Grade Sync Setup

Programming Fundamentals Portal syncs grades from Google Sheets via the Supabase Edge Function `sync-google-sheets`.

**Supabase project ref:** `vlzdexawykxtnjdwbjpt`  
**Dashboard:** https://supabase.com/dashboard/project/vlzdexawykxtnjdwbjpt

## Sheet layout (required)

| Requirement | Example |
|-------------|---------|
| Row 1 = headers | |
| Roll column | `Roll Number` (header must contain `roll`) |
| Grade columns | `Lab 01 (10)`, `Assignment 1 (50)` — max marks in `( )` |
| One row per student | Roll matches enrollment (e.g. `bcsf26m001`) |

Optional tabs: `Labs`, `Assignments`, `Quizzes`, etc. Configure one sheet URL per section (`CS-F26-M`, `CS-F26-A`) in **Admin → Grades Config**.

Do **not** commit service account JSON. It is gitignored (`*service-account*`).

---

## Step 1: Enable Google Sheets API

1. [Google Cloud Console](https://console.cloud.google.com/) → your project  
2. **APIs & Services → Library** → enable **Google Sheets API**

## Step 2: Create a service account

1. **APIs & Services → Credentials → Create credentials → Service account**  
2. Name e.g. `pf-portal-sheets` → Create → Done  
3. Open the service account → **Keys → Add key → JSON** → download  
4. Copy `client_email` from the JSON (ends with `.iam.gserviceaccount.com`)

## Step 3: Share your grade sheet(s)

1. Open the Google Sheet  
2. **Share** → paste `client_email` → role **Viewer** → Send  

## Step 4: Set Supabase secret

Convert the JSON to a **single line** (or paste raw JSON in the Dashboard).

### Option A — Dashboard (easiest)

1. https://supabase.com/dashboard/project/vlzdexawykxtnjdwbjpt/settings/functions  
2. **Edge Function Secrets** → add:
   - Name: `GOOGLE_SERVICE_ACCOUNT`  
   - Value: full JSON contents of the key file  

### Option B — CLI

```powershell
# From project root (folder with supabase/)
npx supabase login
npx supabase link --project-ref vlzdexawykxtnjdwbjpt

# PowerShell: read JSON file as one-line secret
$json = Get-Content -Raw .\your-service-account.json
npx supabase secrets set GOOGLE_SERVICE_ACCOUNT="$json" --project-ref vlzdexawykxtnjdwbjpt
```

## Step 5: Deploy the Edge Function

### Fix: “Access token not provided”

The CLI must be logged in. In **your** PowerShell (not a background agent), run:

```powershell
npx supabase login
```

A browser opens → authorize. After that succeeds, deploy:

```powershell
cd "C:\Users\M. Subhan\Desktop\dsa-portal-main\dsa-portal-main"
npx supabase functions deploy sync-google-sheets --project-ref vlzdexawykxtnjdwbjpt
```

**Alternative (no browser login):** create a token at  
https://supabase.com/dashboard/account/tokens → then:

```powershell
$env:SUPABASE_ACCESS_TOKEN = "sbp_your_token_here"
npx supabase functions deploy sync-google-sheets --project-ref vlzdexawykxtnjdwbjpt
```

Confirm the function appears under **Edge Functions** in the dashboard.

## Step 6: Test in the app

1. `npm run dev` → sign in as admin  
2. **Admin → Grades Config**  
3. Select section **CS-F26-M** (or **CS-F26-A**)  
4. Paste Google Sheet URL → **Save Configuration** → **Sync Now**  
5. Confirm tabs/columns appear; toggle visibility  
6. Student with matching roll opens `/grades` and sees synced scores  

### Common errors

| Error | Fix |
|-------|-----|
| `GOOGLE_SERVICE_ACCOUNT secret not configured` | Set secret (Step 4), redeploy if needed |
| Failed to fetch tabs / permission | Share sheet with `client_email` as Viewer |
| Unauthorized | Sign in again as admin; ensure JWT is sent |
| 0 students synced | Check Roll Number column and non-empty rolls |

## How it works

```
Admin Sync Now → Edge Function sync-google-sheets
  → Google Sheets API (service account)
  → upsert grade_data in Supabase
Student Grades page → reads grade_data (+ visibility from grade_sheets)
```

Frontend entry: `src/lib/googleSheets.ts` → `syncSheetData()`  
Function: `supabase/functions/sync-google-sheets/index.ts`
