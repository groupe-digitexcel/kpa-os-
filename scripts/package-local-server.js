#!/usr/bin/env node
/**
 * Prepare the standalone Next.js server and the Node runtime for Tauri.
 *
 * On Windows CI, the Node executable used to run this script is copied as
 * Tauri's sidecar executable. This avoids a second native-executable toolchain
 * and keeps better-sqlite3 compatible with the same Node major version used
 * during the production build.
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
    "No .next/standalone found. Run `npm run build` first (next.config.js uses output: 'standalone')."
  );
  process.exit(1);
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.mkdirSync(SIDECAR_DIR, { recursive: true });

log("Copying standalone server output...");
fs.cpSync(STANDALONE_DIR, OUTPUT_DIR, { recursive: true });

const staticSource = path.join(ROOT, ".next", "static");
if (fs.existsSync(staticSource)) {
  fs.cpSync(staticSource, path.join(OUTPUT_DIR, ".next", "static"), {
    recursive: true,
  });
}

const publicSource = path.join(ROOT, "public");
if (fs.existsSync(publicSource)) {
  fs.cpSync(publicSource, path.join(OUTPUT_DIR, "public"), { recursive: true });
}

const schemaSource = path.join(ROOT, "lib", "db", "local-schema.sql");
if (fs.existsSync(schemaSource)) {
  fs.mkdirSync(path.join(OUTPUT_DIR, "lib", "db"), { recursive: true });
  fs.cpSync(schemaSource, path.join(OUTPUT_DIR, "lib", "db", "local-schema.sql"));
}

// Tauri's externalBin requires an executable with the target-triple suffix.
// On Windows, the Node runtime executing this script is the correct native
// runtime for the build and can directly launch server.js as its argument.
if (process.platform === "win32" && process.arch === "x64") {
  const target = "x86_64-pc-windows-msvc";
  const sidecarPath = path.join(
    SIDECAR_DIR,
    `kpa-local-server-${target}.exe`
  );
  fs.copyFileSync(process.execPath, sidecarPath);
  log(`Bundled Node runtime: ${sidecarPath}`);
} else if (process.platform === "win32") {
  console.error(`Unsupported Windows architecture: ${process.arch}. KPA-OS currently builds the x64 installer.`);
  process.exit(1);
}

log(`Standalone server is ready at: ${OUTPUT_DIR}`);
log("Tauri can now package the Windows desktop application without a manual sidecar launcher.");
