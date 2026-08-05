import { getCurrentStaff as getCloudStaff } from "@/lib/supabase/server";
import { getLocalDb } from "@/lib/db/local";
import { isLocalMode } from "./mode";

export async function getEffectiveStaff() {
  if (!isLocalMode()) return getCloudStaff();

  const db = getLocalDb();
  const row = db
    .prepare(`SELECT value FROM sync_meta WHERE key = 'current_staff_id'`)
    .get() as { value: string | null } | undefined;

  if (!row?.value) return null;

  return db.prepare(`SELECT * FROM staff WHERE id = ? AND deleted = 0`).get(row.value) ?? null;
}
