/**
 * Ensures storage buckets exist, then prints SQL to create RLS policies.
 *
 * Storage policies cannot be created via PostgREST (/rest/v1/storage/policies).
 * Run the printed SQL (or scripts/setup-storage-policies.sql) in the Supabase SQL Editor.
 *
 * Usage (PowerShell):
 *   $env:SUPABASE_SERVICE_ROLE_KEY = "your_service_role_key"
 *   $env:VITE_SUPABASE_URL = "https://YOUR_REF.supabase.co"
 *   node scripts/setup-storage-policies.js
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function normalizeSupabaseUrl(raw) {
  if (!raw) return raw;
  return raw
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/rest\/v1$/i, "")
    .replace(/\/auth\/v1$/i, "")
    .replace(/\/storage\/v1$/i, "");
}

const SUPABASE_URL = normalizeSupabaseUrl(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
);
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error("❌ Set VITE_SUPABASE_URL (project root only, e.g. https://xxxx.supabase.co)");
  process.exit(1);
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Set SUPABASE_SERVICE_ROLE_KEY (Settings → API → service_role)");
  process.exit(1);
}

if (/\/rest\/v1/i.test(process.env.VITE_SUPABASE_URL || "")) {
  console.warn(
    "⚠️  Your VITE_SUPABASE_URL included /rest/v1/ — using normalized:",
    SUPABASE_URL
  );
}

const BUCKETS = ["labs", "assignments", "quizzes"];

async function ensureBucket(name) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      id: name,
      name,
      public: true,
      file_size_limit: 52428800,
    }),
  });

  if (res.ok) {
    console.log(`✅ Created bucket: ${name}`);
    return;
  }

  const text = await res.text();
  if (
    res.status === 409 ||
    /already exists|duplicate/i.test(text) ||
    /The resource already exists/i.test(text)
  ) {
    console.log(`⚠️  Bucket already exists: ${name}`);
    return;
  }

  console.error(`❌ Failed to create bucket ${name}:`, text);
}

async function main() {
  console.log("🚀 Ensuring storage buckets exist...\n");
  console.log("   Project:", SUPABASE_URL, "\n");

  for (const bucket of BUCKETS) {
    await ensureBucket(bucket);
  }

  const sqlPath = path.join(__dirname, "setup-storage-policies.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");

  console.log(`
────────────────────────────────────────────────────────────
Storage RLS policies must be created in the SQL Editor.

1. Open Supabase → SQL Editor → New query
2. Paste the contents of:
   scripts/setup-storage-policies.sql
3. Click Run

(Or copy the SQL printed below.)
────────────────────────────────────────────────────────────
`);
  console.log(sql);
  console.log("────────────────────────────────────────────────────────────");
  console.log("✅ Buckets ready. Run the SQL above to finish policies.");
}

main().catch((err) => {
  console.error("❌", err.message || err);
  process.exit(1);
});
