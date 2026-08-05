#!/usr/bin/env node
/**
 * Packages the standalone Next.js server + a bundled Node runtime into
 * src-tauri/binaries/, named the way Tauri's sidecar convention requires
 * (a target-triple suffix, e.g. kpa-local-server-x86_64-pc-windows-msvc.exe).
 *
 * WHY A BUNDLED NODE RUNTIME INSTEAD OF A SINGLE COMPILED .exe (pkg/nexe):
 * better-sqlite3 is a native addon (compiled C++ per platform/Node version).
 * Single-executable compilers often fight with native addons. Shipping the
 * standalone Next.js output next to a real Node.exe is more moving parts on
 * disk, but far more reliable — this is the same technique many production
 * Electron/Tauri apps use for a Node backend.
 *
 * Run this AFTER `npm run build` (which produces .next/standalone).
 *
 * Usage: node scripts/package-local-server.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const STANDALONE_DIR = path.join(ROOT, ".next", "standalone");
const OUTPUT_DIR = path.join(ROOT, "local-server-dist");
const SIDECAR_DIR = path.join(ROOT, "src-tauri", "binaries");

function log(msg) {
  console.log(`[package-local-server] ${msg}`);
}

if (!fs.existsSync(STANDALONE_DIR)) {
  console.error(
    "No .next/standalone found. Run `npm run build` first (next.config.js already has output: 'standalone')."
  );
  process.exit(1);
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.mkdirSync(SIDECAR_DIR, { recursive: true });

log("Copying standalone server output...");
fs.cpSync(STANDALONE_DIR, OUTPUT_DIR, { recursive: true });

// Copy static assets + public folder (standalone output doesn't include these)
fs.cpSync(path.join(ROOT, ".next", "static"), path.join(OUTPUT_DIR, ".next", "static"), {
  recursive: true,
});
if (fs.existsSync(path.join(ROOT, "public"))) {
  fs.cpSync(path.join(ROOT, "public"), path.join(OUTPUT_DIR, "public"), { recursive: true });
}
// The local SQLite schema file is read at runtime by lib/db/local.ts
fs.cpSync(
  path.join(ROOT, "lib", "db", "local-schema.sql"),
  path.join(OUTPUT_DIR, "lib", "db", "local-schema.sql")
);

log(`Done. Standalone server is at: ${OUTPUT_DIR}`);
log("");
log("NEXT STEP (manual, one-time per machine you build on):");
log("  1. Download a Windows Node.js binary (node.exe) matching your Node major version");
log(`     from https://nodejs.org/dist/ and place it at: ${SIDECAR_DIR}/node.exe`);
log("  2. Create a small launcher batch/exe that runs:");
log(`       node.exe "${OUTPUT_DIR}\\server.js"`);
log("     (Tauri's externalBin expects ONE executable — package node.exe + server.js");
log("      + a launcher into a self-extracting or portable wrapper, OR use a tool like");
log("      'nexe'/'caxa' to fuse node.exe + this folder into a single .exe sidecar.)");
log("  3. Name the final sidecar exactly:");
log("       src-tauri/binaries/kpa-local-server-x86_64-pc-windows-msvc.exe");
log("     (Tauri requires this target-triple suffix for sidecar binaries.)");
