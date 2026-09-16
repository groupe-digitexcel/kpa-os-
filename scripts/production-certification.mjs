import { existsSync, readFileSync } from "node:fs";

const failures = [];
const required = [
  "package.json",
  ".nvmrc",
  ".github/workflows/ci.yml",
  ".env.example",
  "supabase/schema.sql",
  "lib/db/local.ts",
  "lib/db/sync.ts",
  "lib/supabase/server.ts",
  "app/parent-portal/page.tsx",
  "lib/actions/parentPortal.ts",
  "app/dashboard/director/analytics/page.tsx",
  "app/api/ai/assistant/route.ts",
  "lib/ai/kpa-assistant.ts",
  "lib/actions/communication.ts",
];

for (const file of required) {
  if (!existsSync(file)) failures.push(`Missing required file: ${file}`);
}

if (existsSync("package.json")) {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  if (!/^>=24 <25$/.test(pkg.engines?.node || "")) failures.push("Node engine is not pinned to 24.x");
  if (pkg.dependencies?.next !== "15.5.25") failures.push("Next.js version is not the certified 15.5.25 baseline");
  if (pkg.dependencies?.better-sqlite3 !== "13.0.3") failures.push("better-sqlite3 version is not the certified 13.0.3 baseline");
}

if (existsSync("lib/db/local.ts")) {
  const text = readFileSync("lib/db/local.ts", "utf8");
  if (!text.includes("server-only")) failures.push("Local SQLite boundary is missing server-only enforcement");
}

if (existsSync("lib/db/sync.ts")) {
  const text = readFileSync("lib/db/sync.ts", "utf8");
  for (const table of ["payments", "daily_reconciliation"]) {
    if (!text.includes(`\"${table}\"`)) failures.push(`Sync high-risk table missing: ${table}`);
  }
  if (!text.includes("NEVER_AUTO_RESOLVE")) failures.push("High-risk sync conflict guard is missing");
}

if (existsSync(".env.example")) {
  const env = readFileSync(".env.example", "utf8");
  for (const secret of ["SUPABASE_SERVICE_ROLE_KEY", "OPENROUTER_API_KEY", "CRON_SECRET"]) {
    if (!env.includes(`${secret}=`)) failures.push(`Expected secret placeholder missing: ${secret}`);
  }
}

if (failures.length) {
  console.error("KPA-OS PRODUCTION CERTIFICATION: FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("KPA-OS PRODUCTION CERTIFICATION: STATIC GATES PASSED");
console.log("Next gates requiring live credentials/environment: Supabase RLS verification, payment/reconciliation transaction tests, offline sync test, PWA install test, Tauri packaging test, and end-to-end role tests.");
