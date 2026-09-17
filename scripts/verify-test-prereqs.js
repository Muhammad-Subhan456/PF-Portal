/**
 * Verifies local testing prerequisites (Workflow A/B/C).
 * Usage: node scripts/verify-test-prereqs.js
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadEnv() {
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) out[m[1].trim()] = m[2].trim();
  }
  return out;
}

const env = loadEnv();
let failed = 0;

function ok(msg) {
  console.log(`✅ ${msg}`);
}
function bad(msg) {
  console.error(`❌ ${msg}`);
  failed++;
}

console.log("🔍 Programming Fundamentals Portal — test prerequisites\n");

const url = env.VITE_SUPABASE_URL || "";
if (!url) bad("VITE_SUPABASE_URL missing in .env");
else if (/\/rest\/v1/i.test(url)) bad(`VITE_SUPABASE_URL must not include /rest/v1/ (got ${url})`);
else if (!/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/i.test(url.replace(/\/$/, "")))
  bad(`VITE_SUPABASE_URL looks invalid: ${url}`);
else ok(`Supabase URL OK: ${url.replace(/\/$/, "")}`);

if (!env.VITE_SUPABASE_ANON_KEY) bad("VITE_SUPABASE_ANON_KEY missing");
else ok("Anon key present");

if (!env.VITE_BOOTSTRAP_ADMIN_EMAILS) bad("VITE_BOOTSTRAP_ADMIN_EMAILS missing (needed for owner admin login)");
else ok(`Bootstrap admin emails: ${env.VITE_BOOTSTRAP_ADMIN_EMAILS}`);

const checks = [
  ["src/pages/Login.tsx", "Programming Fundamentals Portal"],
  ["src/pages/Login.tsx", "Fall 2026"],
  ["src/lib/students.ts", "CS-F26-M"],
  ["src/lib/students.ts", "CS-F26-A"],
  ["TESTING_WORKFLOW.md", "Workflow A"],
  ["scripts/seed-test-data.sql", "CS-F26-M"],
  ["scripts/promote-admin.sql", "admins"],
];

for (const [file, needle] of checks) {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) {
    bad(`Missing file: ${file}`);
    continue;
  }
  const text = fs.readFileSync(p, "utf8");
  if (!text.includes(needle)) bad(`${file} missing expected text: ${needle}`);
  else ok(`${file} contains "${needle}"`);
}

const ports = [8080, 8081, 8082];
let reachable = false;
for (const port of ports) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/`, { redirect: "manual" });
    ok(`Dev server responds on http://localhost:${port}/ (HTTP ${res.status})`);
    reachable = true;
    break;
  } catch {
    // try next
  }
}
if (!reachable) bad("Dev server not reachable on 8080–8082 — run npm run dev");

const routeFile = path.join(root, "src/App.tsx");
const routeSrc = fs.readFileSync(routeFile, "utf8");
const aclPairs = [
  ['path="/admin"', "requireAdmin"],
  ['path="/"', "ProtectedRoute"],
  ['path="/login"', "Login"],
];
for (const [a, b] of aclPairs) {
  if (routeSrc.includes(a) && routeSrc.includes(b)) ok(`Routing ACL: ${a} wired with ${b}`);
  else bad(`Routing ACL missing: ${a} / ${b}`);
}

const guard = path.join(root, "src/components/ProtectedRoute.tsx");
const guardSrc = fs.readFileSync(guard, "utf8");
if (guardSrc.includes("requireAdmin") && guardSrc.includes('Navigate to="/login"'))
  ok("ProtectedRoute enforces login + admin gate");
else bad("ProtectedRoute missing login/admin redirects");

const auth = path.join(root, "src/lib/auth.ts");
const authSrc = fs.readFileSync(auth, "utf8");
if (authSrc.includes("validateUserAccess") && authSrc.includes("isBootstrapAdminEmail"))
  ok("Access gate: validateUserAccess + bootstrap admins");
else bad("Access gate helpers missing in auth.ts");

console.log("");
if (failed === 0) {
  console.log("✅ Prerequisites OK. Continue with TESTING_WORKFLOW.md (Workflow A → B → C).");
  console.log("   Next: run scripts/seed-test-data.sql in Supabase, then Google-login as admin.");
  process.exit(0);
} else {
  console.log(`❌ ${failed} check(s) failed.`);
  process.exit(1);
}
