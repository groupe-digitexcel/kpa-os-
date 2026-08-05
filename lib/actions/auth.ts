"use server";

import { createClient } from "@/lib/supabase/server";
import { getLocalDb, nowIso } from "@/lib/db/local";
import { isLocalMode } from "@/lib/data/mode";

// Called once from the login page right after a successful Supabase Auth
// sign-in. No-ops in cloud mode. In local mode it:
//  1. Pulls the staff row from Supabase (requires internet, same as login itself)
//  2. Caches it in the local SQLite `staff` table
//  3. Remembers "this is who's using this computer" in sync_meta, so every
//     offline action after this point knows who the actor is without needing
//     a network round-trip.
//
// LIMITATION (flagged deliberately, not hidden): this cached session persists
// until someone logs in as a different staff member on this machine. There is
// no PIN-based fully-offline *login* yet — the very first login of the day
// still needs internet. If staff regularly need to log in fresh while offline,
// that's a follow-up piece (local PIN auth) worth building next.
export async function cacheStaffSessionLocally() {
  if (!isLocalMode()) return { skipped: true };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: staff } = await supabase
    .from("staff")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();

  if (!staff) return { error: "No staff record found for this account." };

  const db = getLocalDb();

  db.prepare(
    `INSERT INTO staff (id, auth_user_id, full_name, role, phone, email, active, created_at, updated_at, synced_at)
     VALUES (@id, @auth_user_id, @full_name, @role, @phone, @email, @active, @created_at, @updated_at, @synced_at)
     ON CONFLICT(id) DO UPDATE SET
       full_name = excluded.full_name,
       role = excluded.role,
       phone = excluded.phone,
       email = excluded.email,
       active = excluded.active,
       synced_at = excluded.synced_at`
  ).run({
    id: staff.id,
    auth_user_id: staff.auth_user_id,
    full_name: staff.full_name,
    role: staff.role,
    phone: staff.phone ?? null,
    email: staff.email ?? null,
    active: staff.active ? 1 : 0,
    created_at: staff.created_at,
    updated_at: nowIso(),
    synced_at: nowIso(),
  });

  db.prepare(`UPDATE sync_meta SET value = ? WHERE key = 'current_staff_id'`).run(staff.id);

  return { success: true, staff };
}
