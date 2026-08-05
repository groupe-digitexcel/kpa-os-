"use server";

import { getLocalDb, nowIso } from "./local";
import { createClient } from "@/lib/supabase/server";

// Tables that participate in two-way sync, in dependency order (parents
// before children, so foreign keys resolve correctly on pull).
const SYNC_TABLES = [
  "staff",
  "classes",
  "parents",
  "students",
  "fee_structure",
  "payments",
  "daily_reconciliation",
  "attendance_checks",
  "daily_attendance",
  "inventory_items",
  "inventory_transactions",
  "sms_log",
  "documents_generated",
  "subjects",
  "assessments",
  "grades",
  "health_records",
  "incidents",
  "staff_attendance",
  "timetable_periods",
  "admissions",
  "expenses",
  "sponsors",
  "school_settings",
] as const;

// Money/reconciliation records are too high-stakes for automatic last-write-wins.
// If both a local and remote version changed since last sync, ALWAYS defer to
// a human via sync_conflicts rather than silently picking one.
const NEVER_AUTO_RESOLVE = new Set(["daily_reconciliation", "payments"]);

type SyncResult = {
  pushed: number;
  pushFailed: number;
  pulled: number;
  conflicts: number;
};

// ---------- PUSH: local changes -> Supabase ----------
async function pushPendingChanges(): Promise<{ pushed: number; failed: number }> {
  const db = getLocalDb();
  const supabase = await createClient();

  const pending = db
    .prepare(`SELECT * FROM sync_queue ORDER BY created_at ASC LIMIT 200`)
    .all() as any[];

  let pushed = 0;
  let failed = 0;

  for (const item of pending) {
    const payload = JSON.parse(item.payload);

    try {
      if (item.operation === "delete") {
        const { error } = await supabase.from(item.table_name).delete().eq("id", item.record_id);
        if (error) throw error;
      } else {
        // upsert covers both insert and update
        const { error } = await supabase.from(item.table_name).upsert(payload, { onConflict: "id" });
        if (error) throw error;
      }

      db.prepare(`DELETE FROM sync_queue WHERE id = ?`).run(item.id);
      db.prepare(
        `UPDATE ${item.table_name} SET synced_at = ? WHERE id = ?`
      ).run(nowIso(), item.record_id);

      pushed++;
    } catch (err: any) {
      failed++;
      db.prepare(
        `UPDATE sync_queue SET attempts = attempts + 1, last_error = ? WHERE id = ?`
      ).run(String(err?.message ?? err), item.id);

      // After repeated failures, stop retrying blindly and surface it as a conflict
      // for a human to look at, so a bad row can't jam the whole queue forever.
      if (item.attempts >= 4) {
        db.prepare(
          `INSERT INTO sync_conflicts (id, table_name, record_id, local_payload, remote_payload, resolution)
           VALUES (lower(hex(randomblob(16))), ?, ?, ?, '{}', 'pending')`
        ).run(item.table_name, item.record_id, item.payload);
        db.prepare(`DELETE FROM sync_queue WHERE id = ?`).run(item.id);
      }
    }
  }

  return { pushed, failed };
}

// ---------- PULL: Supabase changes -> local ----------
async function pullRemoteChanges(): Promise<{ pulled: number; conflicts: number }> {
  const db = getLocalDb();
  const supabase = await createClient();

  const lastPullRow = db.prepare(`SELECT value FROM sync_meta WHERE key = 'last_pull_at'`).get() as
    | { value: string | null }
    | undefined;
  const since = lastPullRow?.value ?? "1970-01-01T00:00:00.000Z";

  let pulled = 0;
  let conflicts = 0;

  for (const table of SYNC_TABLES) {
    const { data: remoteRows, error } = await supabase
      .from(table)
      .select("*")
      .gt("updated_at", since);

    if (error || !remoteRows) continue;

    for (const remote of remoteRows) {
      const local = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(remote.id) as any;

      // Is there an un-pushed local change for this exact record?
      const hasPendingLocalChange = db
        .prepare(`SELECT 1 FROM sync_queue WHERE table_name = ? AND record_id = ? LIMIT 1`)
        .get(table, remote.id);

      if (local && hasPendingLocalChange) {
        // Both sides changed since last sync -> conflict.
        if (NEVER_AUTO_RESOLVE.has(table)) {
          db.prepare(
            `INSERT INTO sync_conflicts (id, table_name, record_id, local_payload, remote_payload)
             VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?)`
          ).run(table, remote.id, JSON.stringify(local), JSON.stringify(remote));
          conflicts++;
          continue;
        }

        // Last-write-wins for everything else, by updated_at timestamp.
        const localNewer = new Date(local.updated_at) > new Date(remote.updated_at);
        if (localNewer) continue; // keep local, it'll push up next cycle
      }

      upsertLocalRow(db, table, remote);
      pulled++;
    }
  }

  db.prepare(`UPDATE sync_meta SET value = ? WHERE key = 'last_pull_at'`).run(nowIso());

  return { pulled, conflicts };
}

function upsertLocalRow(db: ReturnType<typeof getLocalDb>, table: string, row: Record<string, any>) {
  const columns = Object.keys(row);
  const placeholders = columns.map(() => "?").join(", ");
  const updates = columns.map((c) => `${c} = excluded.${c}`).join(", ");
  const values = columns.map((c) => {
    const v = row[c];
    if (v === null || v === undefined) return null;
    if (typeof v === "object") return JSON.stringify(v);
    if (typeof v === "boolean") return v ? 1 : 0;
    return v;
  });

  db.prepare(
    `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})
     ON CONFLICT(id) DO UPDATE SET ${updates}`
  ).run(...values);

  db.prepare(`UPDATE ${table} SET synced_at = ? WHERE id = ?`).run(nowIso(), row.id);
}

// ---------- Public entry point, called from the client on an interval + on 'online' ----------
export async function triggerSync(): Promise<SyncResult> {
  const pushResult = await pushPendingChanges();
  const pullResult = await pullRemoteChanges();

  return {
    pushed: pushResult.pushed,
    pushFailed: pushResult.failed,
    pulled: pullResult.pulled,
    conflicts: pullResult.conflicts,
  };
}

export async function getSyncStatus() {
  const db = getLocalDb();

  const pending = db.prepare(`SELECT COUNT(*) as c FROM sync_queue`).get() as { c: number };
  const conflicts = db
    .prepare(`SELECT COUNT(*) as c FROM sync_conflicts WHERE resolution = 'pending'`)
    .get() as { c: number };
  const lastPull = db.prepare(`SELECT value FROM sync_meta WHERE key = 'last_pull_at'`).get() as
    | { value: string | null }
    | undefined;

  return {
    pendingChanges: pending.c,
    unresolvedConflicts: conflicts.c,
    lastSyncedAt: lastPull?.value ?? null,
  };
}

export async function getUnresolvedConflicts() {
  const db = getLocalDb();
  return db
    .prepare(`SELECT * FROM sync_conflicts WHERE resolution = 'pending' ORDER BY created_at DESC`)
    .all();
}

export async function resolveConflict(
  conflictId: string,
  resolution: "kept_local" | "kept_remote"
) {
  const db = getLocalDb();
  const conflict = db.prepare(`SELECT * FROM sync_conflicts WHERE id = ?`).get(conflictId) as any;
  if (!conflict) return { error: "Conflict not found." };

  const chosen = resolution === "kept_local" ? JSON.parse(conflict.local_payload) : JSON.parse(conflict.remote_payload);

  upsertLocalRow(db, conflict.table_name, chosen);

  if (resolution === "kept_local") {
    db.prepare(
      `INSERT INTO sync_queue (id, table_name, record_id, operation, payload)
       VALUES (lower(hex(randomblob(16))), ?, ?, 'update', ?)`
    ).run(conflict.table_name, conflict.record_id, conflict.local_payload);
  }

  db.prepare(
    `UPDATE sync_conflicts SET resolution = ?, resolved_at = ? WHERE id = ?`
  ).run(resolution, nowIso(), conflictId);

  return { success: true };
}
