"use server";

import { getLocalDb } from "@/lib/db/local";
import { getEffectiveStaff } from "@/lib/data/currentStaff";
import { isLocalMode } from "@/lib/data/mode";
import fs from "fs";
import path from "path";
import os from "os";

// Called silently from the sync cycle. Creates at most one backup per
// calendar day, so the app doesn't need staff to remember to do it manually.
export async function maybeAutoBackup() {
  if (!isLocalMode()) return { skipped: true };

  const db = getLocalDb();
  const today = new Date().toISOString().slice(0, 10);
  const row = db.prepare(`SELECT value FROM sync_meta WHERE key = 'last_auto_backup_date'`).get() as
    | { value: string | null }
    | undefined;

  if (row?.value === today) return { skipped: true };

  const backupDir = getBackupDir();
  const backupPath = path.join(backupDir, `kpa-autobackup-${today}.db`);
  await db.backup(backupPath);

  db.prepare(
    `INSERT INTO sync_meta (key, value) VALUES ('last_auto_backup_date', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(today);

  return { created: true };
}

function getBackupDir() {
  const dir = process.env.LOCAL_DB_DIR ?? path.join(os.homedir(), ".kpa-os");
  const backupDir = path.join(dir, "backups");
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  return backupDir;
}

// Uses SQLite's own backup API (via better-sqlite3's .backup()) rather than a
// raw file copy, so a backup taken while the app is running is guaranteed
// consistent (no half-written pages).
export async function createBackup() {
  const staff = await getEffectiveStaff();
  if (!isLocalMode()) return { error: "Backups only apply to the local desktop app." };
  if (!staff || (staff.role !== "director" && staff.role !== "accountant")) {
    return { error: "Only the Director or Accountant can create backups." };
  }

  const db = getLocalDb();
  const backupDir = getBackupDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupDir, `kpa-backup-${timestamp}.db`);

  await db.backup(backupPath);

  // Keep the most recent 20 backups; prune older ones so disk doesn't fill up.
  const files = fs
    .readdirSync(backupDir)
    .filter((f) => f.endsWith(".db"))
    .map((f) => ({ name: f, time: fs.statSync(path.join(backupDir, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  for (const f of files.slice(20)) {
    fs.unlinkSync(path.join(backupDir, f.name));
  }

  return { success: true, path: backupPath, filename: path.basename(backupPath) };
}

export async function listBackups() {
  if (!isLocalMode()) return [];

  const backupDir = getBackupDir();
  if (!fs.existsSync(backupDir)) return [];

  return fs
    .readdirSync(backupDir)
    .filter((f) => f.endsWith(".db"))
    .map((f) => {
      const stat = fs.statSync(path.join(backupDir, f));
      return { filename: f, sizeKb: Math.round(stat.size / 1024), createdAt: stat.mtime.toISOString() };
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

// Restoring requires restarting the app after this call (the running process
// has an open handle on the current DB file). This swaps the active file for
// the chosen backup; the sidecar picks it up fresh on next launch.
export async function restoreBackup(filename: string) {
  const staff = await getEffectiveStaff();
  if (!isLocalMode()) return { error: "Restore only applies to the local desktop app." };
  if (!staff || staff.role !== "director") {
    return { error: "Only the Director can restore a backup." };
  }

  const backupDir = getBackupDir();
  const backupPath = path.join(backupDir, filename);
  if (!fs.existsSync(backupPath)) return { error: "Backup file not found." };

  const dbDir = process.env.LOCAL_DB_DIR ?? path.join(os.homedir(), ".kpa-os");
  const activePath = path.join(dbDir, "kpa-local.db");

  // Safety copy of the current (about-to-be-replaced) database, just in case.
  const safetyPath = path.join(backupDir, `pre-restore-safety-${Date.now()}.db`);
  if (fs.existsSync(activePath)) fs.copyFileSync(activePath, safetyPath);

  fs.copyFileSync(backupPath, activePath);
  // Clean up WAL/SHM sidecar files so SQLite doesn't try to replay stale ones.
  for (const ext of ["-wal", "-shm"]) {
    const p = activePath + ext;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }

  return { success: true, restartRequired: true };
}
