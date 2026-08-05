"use server";

import { createClient } from "@/lib/supabase/server";
import { getLocalDb, newId, nowIso, writeWithSync } from "@/lib/db/local";
import { getEffectiveStaff } from "@/lib/data/currentStaff";
import { isLocalMode } from "@/lib/data/mode";
import { revalidatePath } from "next/cache";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export async function getMyTodayAttendance() {
  const staff = await getEffectiveStaff();
  if (!staff) return null;

  if (isLocalMode()) {
    const db = getLocalDb();
    return (
      db
        .prepare(`SELECT * FROM staff_attendance WHERE staff_id = ? AND attendance_date = ? AND deleted = 0`)
        .get(staff.id, today()) ?? null
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("staff_attendance")
    .select("*")
    .eq("staff_id", staff.id)
    .eq("attendance_date", today())
    .maybeSingle();
  return data;
}

export async function clockIn() {
  const staff = await getEffectiveStaff();
  if (!staff) return { error: "Not authenticated" };

  const now = nowIso();

  if (isLocalMode()) {
    const db = getLocalDb();
    const existing = db
      .prepare(`SELECT id FROM staff_attendance WHERE staff_id = ? AND attendance_date = ?`)
      .get(staff.id, today()) as { id: string } | undefined;

    if (existing) return { error: "Already clocked in today." };

    const id = newId();
    const row = { id, staff_id: staff.id, attendance_date: today(), clock_in: now, clock_out: null, created_at: now, updated_at: now };

    writeWithSync("staff_attendance", id, "insert", row, (db) => {
      db.prepare(
        `INSERT INTO staff_attendance (id, staff_id, attendance_date, clock_in, created_at, updated_at)
         VALUES (@id, @staff_id, @attendance_date, @clock_in, @created_at, @updated_at)`
      ).run(row);
    });

    revalidatePath("/dashboard");
    return { data: row };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("staff_attendance")
    .insert({ staff_id: staff.id, attendance_date: today(), clock_in: now })
    .select()
    .single();

  if (error) return { error: "Already clocked in today, or could not record." };
  revalidatePath("/dashboard");
  return { data };
}

export async function clockOut() {
  const staff = await getEffectiveStaff();
  if (!staff) return { error: "Not authenticated" };

  const now = nowIso();

  if (isLocalMode()) {
    const db = getLocalDb();
    const existing = db
      .prepare(`SELECT id FROM staff_attendance WHERE staff_id = ? AND attendance_date = ?`)
      .get(staff.id, today()) as { id: string } | undefined;

    if (!existing) return { error: "You haven't clocked in yet today." };

    writeWithSync(
      "staff_attendance",
      existing.id,
      "update",
      { id: existing.id, clock_out: now, updated_at: now },
      (db) => {
        db.prepare(`UPDATE staff_attendance SET clock_out = ?, updated_at = ? WHERE id = ?`).run(now, now, existing.id);
      }
    );

    revalidatePath("/dashboard");
    return { success: true };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("staff_attendance")
    .update({ clock_out: now })
    .eq("staff_id", staff.id)
    .eq("attendance_date", today());

  if (error) return { error: "Could not clock out." };
  revalidatePath("/dashboard");
  return { success: true };
}

export async function getStaffAttendanceToday() {
  if (isLocalMode()) {
    const db = getLocalDb();
    const rows = db
      .prepare(
        `SELECT sa.*, st.full_name, st.role
         FROM staff_attendance sa JOIN staff st ON st.id = sa.staff_id
         WHERE sa.attendance_date = ? AND sa.deleted = 0
         ORDER BY st.full_name`
      )
      .all(today()) as any[];
    return rows.map((r) => ({ ...r, staff: { full_name: r.full_name, role: r.role } }));
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("staff_attendance")
    .select("*, staff:staff_id(full_name, role)")
    .eq("attendance_date", today())
    .order("clock_in");
  return data ?? [];
}
