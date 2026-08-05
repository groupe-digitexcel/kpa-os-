import Database from "better-sqlite3";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";
import os from "os";

// Where the local database file lives on the staff computer.
// Tauri sets LOCAL_DB_DIR to its app-data directory; falls back to a local
// folder for `npm run dev` testing without Tauri.
function getDbPath() {
  const dir =
    process.env.LOCAL_DB_DIR ??
    path.join(os.homedir(), ".kpa-os");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "kpa-local.db");
}

let dbInstance: Database.Database | null = null;

export function getLocalDb() {
  if (dbInstance) return dbInstance;

  const db = new Database(getDbPath());
  db.pragma("journal_mode = WAL"); // safer against power loss / crashes mid-write
  db.pragma("foreign_keys = ON");

  const schemaPath = path.join(process.cwd(), "lib", "db", "local-schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf-8");
  db.exec(schema);

  runMigrations(db);

  dbInstance = db;
  return db;
}

// ALTER TABLE ADD COLUMN isn't idempotent in SQLite (errors if the column
// already exists), so new columns added to existing tables after the initial
// release go here instead of local-schema.sql, guarded by a table_info check.
function runMigrations(db: Database.Database) {
  const addColumnIfMissing = (table: string, column: string, definition: string) => {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    if (!columns.some((c) => c.name === column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  };

  addColumnIfMissing("daily_attendance", "arrival_time", "TEXT");
  addColumnIfMissing("daily_attendance", "departure_time", "TEXT");
  addColumnIfMissing("daily_attendance", "picked_up_by", "TEXT");
  addColumnIfMissing("parents", "access_code", "TEXT");
  addColumnIfMissing("documents_generated", "grades_snapshot", "TEXT");
  addColumnIfMissing("staff", "pin_hash", "TEXT");

export function newId() {
  return randomUUID();
}

export function nowIso() {
  return new Date().toISOString();
}

// Every write that should eventually reach Supabase goes through here: writes
// the row locally AND drops a row in sync_queue in the same transaction, so a
// crash between the two can never happen (either both commit or neither does).
export function writeWithSync(
  tableName: string,
  recordId: string,
  operation: "insert" | "update" | "delete",
  payload: Record<string, any>,
  applyLocalWrite: (db: Database.Database) => void
) {
  const db = getLocalDb();

  const txn = db.transaction(() => {
    applyLocalWrite(db);

    db.prepare(
      `INSERT INTO sync_queue (id, table_name, record_id, operation, payload)
       VALUES (?, ?, ?, ?, ?)`
    ).run(newId(), tableName, recordId, operation, JSON.stringify(payload));
  });

  txn();
}

export function getPendingSyncCount() {
  const db = getLocalDb();
  const row = db.prepare(`SELECT COUNT(*) as count FROM sync_queue`).get() as { count: number };
  return row.count;
}

export function getUnresolvedConflictCount() {
  const db = getLocalDb();
  const row = db
    .prepare(`SELECT COUNT(*) as count FROM sync_conflicts WHERE resolution = 'pending'`)
    .get() as { count: number };
  return row.count;
}
