/**
 * Smoke-check that the sync-google-sheets Edge Function is deployed.
 * Does not perform a full sync (needs auth + sheet + secret).
 *
 * Usage:
 *   node scripts/verify-sheets-function.js
 */

const url = (process.env.VITE_SUPABASE_URL || "").replace(/\/+$/, "").replace(/\/rest\/v1$/i, "");
const anon = process.env.VITE_SUPABASE_ANON_KEY || "";

async function loadEnvFile() {
  try {
    const fs = await import("fs");
    const path = await import("path");
    const { fileURLToPath } = await import("url");
    const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
    const text = fs.readFileSync(path.join(root, ".env"), "utf8");
    const env = {};
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) env[m[1].trim()] = m[2].trim();
    }
    return env;
  } catch {
    return {};
  }
}

const fileEnv = await loadEnvFile();
const SUPABASE_URL = (url || fileEnv.VITE_SUPABASE_URL || "").replace(/\/+$/, "").replace(/\/rest\/v1$/i, "");
const ANON = anon || fileEnv.VITE_SUPABASE_ANON_KEY || "";

if (!SUPABASE_URL || !ANON) {
  console.error("❌ Need VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env");
  process.exit(1);
}

const fnUrl = `${SUPABASE_URL}/functions/v1/sync-google-sheets`;
console.log("🔍 Checking Edge Function:", fnUrl);

try {
  const res = await fetch(fnUrl, {
    method: "OPTIONS",
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
    },
  });
  console.log(`   OPTIONS → HTTP ${res.status}`);

  const res2 = await fetch(fnUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
    },
    body: JSON.stringify({ sheetId: "smoke-test" }),
  });
  const body = await res2.text();
  console.log(`   POST (anon) → HTTP ${res2.status}`);
  console.log(`   Body (truncated): ${body.slice(0, 200)}`);

  if (res2.status === 404) {
    console.error("\n❌ Function not deployed. Run:");
    console.error("   npx supabase functions deploy sync-google-sheets --project-ref vlzdexawykxtnjdwbjpt");
    process.exit(1);
  }

  // 401 = deployed but needs user JWT; 500 with GOOGLE_SERVICE_ACCOUNT = deployed, needs secret
  if (res2.status === 401 || /Unauthorized|GOOGLE_SERVICE_ACCOUNT|sheetId|Google/i.test(body)) {
    console.log("\n✅ Function is reachable (auth/secret/sheet errors are expected without full setup).");
    console.log("   Next: set GOOGLE_SERVICE_ACCOUNT secret, share sheet, Sync Now in Admin UI.");
    process.exit(0);
  }

  console.log("\n⚠️ Unexpected response — check dashboard Edge Functions logs.");
  process.exit(0);
} catch (e) {
  console.error("❌", e.message || e);
  process.exit(1);
}
