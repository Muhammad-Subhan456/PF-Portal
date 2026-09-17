# Set GOOGLE_SERVICE_ACCOUNT secret (do not commit this file or your JSON key)

## Dashboard (recommended)

1. Open: https://supabase.com/dashboard/project/vlzdexawykxtnjdwbjpt/settings/functions
2. Under Edge Function Secrets, add:
   - Name: `GOOGLE_SERVICE_ACCOUNT`
   - Value: paste the **entire** contents of your service-account JSON key file
3. Save

## CLI alternative

```powershell
cd "C:\Users\M. Subhan\Desktop\dsa-portal-main\dsa-portal-main"
npx supabase login
npx supabase link --project-ref vlzdexawykxtnjdwbjpt
$json = Get-Content -Raw .\YOUR-KEY-FILE.json
npx supabase secrets set GOOGLE_SERVICE_ACCOUNT="$json" --project-ref vlzdexawykxtnjdwbjpt
```

## Then share the sheet

Copy `client_email` from the JSON → Google Sheet → Share → Viewer.

## Then deploy

```powershell
npx supabase functions deploy sync-google-sheets --project-ref vlzdexawykxtnjdwbjpt
```

Full guide: [GOOGLE_SHEETS_SETUP.md](../GOOGLE_SHEETS_SETUP.md)
