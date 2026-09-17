# Deploy sync-google-sheets to Supabase (run in PowerShell from project root)
# Requires: npx supabase login (browser) once

$ErrorActionPreference = "Stop"
$ProjectRef = "vlzdexawykxtnjdwbjpt"
Set-Location $PSScriptRoot\..

Write-Host "==> Ensure you are logged in (opens browser if needed)..."
npx supabase login

Write-Host "==> Link project $ProjectRef ..."
npx supabase link --project-ref $ProjectRef

Write-Host @"

==> Set GOOGLE_SERVICE_ACCOUNT secret
Paste your service-account JSON path when prompted, or set manually:

  `$json = Get-Content -Raw .\your-key.json
  npx supabase secrets set GOOGLE_SERVICE_ACCOUNT="`$json" --project-ref $ProjectRef

Or use Dashboard:
  https://supabase.com/dashboard/project/$ProjectRef/settings/functions

"@

$keyPath = Read-Host "Path to service-account JSON (leave blank to skip secret)"
if ($keyPath -and (Test-Path $keyPath)) {
  $json = Get-Content -Raw $keyPath
  npx supabase secrets set GOOGLE_SERVICE_ACCOUNT="$json" --project-ref $ProjectRef
  Write-Host "Secret set."
} else {
  Write-Host "Skipped secret (set in Dashboard if needed)."
}

Write-Host "==> Deploying function..."
npx supabase functions deploy sync-google-sheets --project-ref $ProjectRef

Write-Host "==> Verify..."
node scripts/verify-sheets-function.js

Write-Host @"

Done. Next in the app:
  Admin → Grades Config → paste sheet URL → Save → Sync Now
  (Share the sheet with the service account client_email as Viewer first.)
"@
