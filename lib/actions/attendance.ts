"use server";

import { createClient } from "@/lib/supabase/server";
import { getLocalDb, newId, nowIso, writeWithSync } from "@/lib/db/local";
import { getEffectiveStaff } from "@/lib/data/currentStaff";
import { isLocalMode } from "@/lib/data/mode";
import { revalidatePath } from "next/cache";

export async function getClassesWithCounts() {
  if (isLocalMode()) {
    const db = getLocalDb();
    const rows = db
      .prepare(
        `SELECT c.id, c.name,
                (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id AND s.status = 'active' AND s.deleted = 0) as student_count
         FROM classes c WHERE c.deleted = 0 ORDER BY c.name`
      )
      .all() as any[];
    return rows.map((r) => ({ id: r.id, name: r.name, students: [{ count: r.student_count }] }));
  }

  const supabase = await createClient();
  const { data } = await supabase.from("classes").select("id, name, students(count)").order("name");
  return data ?? [];
}

export async function submitAttendanceCheck(input: {
  classId: string;
  physicalCount: number;
  newStudentsFound: { name: string; age: number; sex: "M" | "F" }[];
  notes?: string;
}) {
  const staff = await getEffectiveStaff();
  if (!staff) return { error: "Not authenticated" };

  if (isLocalMode()) {
    const db = getLocalDb();
    const now = nowIso();

    const regCount = db
      .prepare(`SELECT COUNT(*) as c FROM students WHERE class_id = ? AND status = 'active' AND deleted = 0`)
      .get(input.classId) as { c: number };

    const id = newId();
    const row = {
      id,
      class_id: input.classId,
      checked_by: staff.id,
      check_date: now.slice(0, 10),
      register_count: regCount.c,
      physical_count: input.physicalCount,
      discrepancy: input.physicalCount - regCount.c,
      new_students_found: input.newStudentsFound.length > 0 ? JSON.stringify(input.newStudentsFound) : null,
      notes: input.notes ?? null,
      created_at: now,
      updated_at: now,
    };

    writeWithSync("attendance_checks", id, "insert", row, (db) => {
      db.prepare(
        `INSERT INTO attendance_checks (id, class_id, checked_by, check_date, register_count, physical_count, discrepancy, new_students_found, notes, created_at, updated_at)
         VALUES (@id, @class_id, @checked_by, @check_date, @register_count, @physical_count, @discrepancy, @new_students_found, @notes, @created_at, @updated_at)`
      ).run(row);
    });

    const auditId = newId();
    writeWithSync(
      "audit_log",
      auditId,
      "insert",
      { id: auditId, actor_id: staff.id, action: "attendance_check_submitted", entity: "attendance_checks", entity_id: id, details: JSON.stringify({ discrepancy: row.discrepancy, new_students_found: input.newStudentsFound.length }), created_at: now },
      (db) => {
        db.prepare(
          `INSERT INTO audit_log (id, actor_id, action, entity, entity_id, details, created_at)
           VALUES (?, ?, 'attendance_check_submitted', 'attendance_checks', ?, ?, ?)`
        ).run(auditId, staff.id, id, JSON.stringify({ discrepancy: row.discrepancy, new_students_found: input.newStudentsFound.length }), now);
      }
    );

    revalidatePath("/dashboard/secretary/attendance");
    return { data: row };
  }

  const supabase = await createClient();
  const { count: registerCount } = await supabase
    .from("students")
    .select("*", { count: "exact", head: true })
    .eq("class_id", input.classId)
    .eq("status", "active");

  const { data, error } = await supabase
    .from("attendance_checks")
    .insert({
      class_id: input.classId,
      checked_by: staff.id,
      register_count: registerCount ?? 0,
      physical_count: input.physicalCount,
      new_students_found: input.newStudentsFound.length > 0 ? input.newStudentsFound : null,
      notes: input.notes ?? null,
    })
    .select()
    .single();

  if (error) return { error: "Could not submit attendance check." };

  await supabase.from("audit_log").insert({
    actor_id: staff.id,
    action: "attendance_check_submitted",
    entity: "attendance_checks",
    entity_id: data.id,
    details: { discrepancy: input.physicalCount - (registerCount ?? 0), new_students_found: input.newStudentsFound.length },
  });

  revalidatePath("/dashboard/secretary/attendance");
  return { data };
}

export async function getRecentAttendanceChecks(limit = 10) {
  if (isLocalMode()) {
    const db = getLocalDb();
    const rows = db
      .prepare(
        `SELECT ac.*, c.name as class_name, st.full_name as staff_name
         FROM attendance_checks ac
         LEFT JOIN classes c ON c.id = ac.class_id
         LEFT JOIN staff st ON st.id = ac.checked_by
         WHERE ac.deleted = 0
         ORDER BY ac.created_at DESC LIMIT ?`
      )
      .all(limit) as any[];

    return rows.map((r) => ({
      ...r,
      class: { name: r.class_name },
      staff: { full_name: r.staff_name },
      new_students_found: r.new_students_found ? JSON.parse(r.new_students_found) : null,
    }));
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("attendance_checks")
    .select("*, class:classes(name), staff:checked_by(full_name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function markArrival(studentId: string, pickedUpBy?: string) {
  const staff = await getEffectiveStaff();
  if (!staff) return { error: "Not authenticated" };

  const today = new Date().toISOString().slice(0, 10);
  const now = nowIso();

  if (isLocalMode()) {
    const db = getLocalDb();
    const existing = db
      .prepare(`SELECT id FROM daily_attendance WHERE student_id = ? AND attendance_date = ?`)
      .get(studentId, today) as { id: string } | undefined;

    const id = existing?.id ?? newId();
    const row = {
      id,
      student_id: studentId,
      attendance_date: today,
      present: 1,
      marked_by: staff.id,
      arrival_time: now,
      picked_up_by: pickedUpBy ?? null,
      created_at: now,
      updated_at: now,
    };

    writeWithSync("daily_attendance", id, existing ? "update" : "insert", row, (db) => {
      db.prepare(
        `INSERT INTO daily_attendance (id, student_id, attendance_date, present, marked_by, arrival_time, picked_up_by, created_at, updated_at)
         VALUES (@id, @student_id, @attendance_date, @present, @marked_by, @arrival_time, @picked_up_by, @created_at, @updated_at)
         ON CONFLICT(student_id, attendance_date) DO UPDATE SET arrival_time = excluded.arrival_time, picked_up_by = excluded.picked_up_by, present = 1, updated_at = excluded.updated_at`
      ).run(row);
    });

    revalidatePath("/dashboard/secretary/attendance");
    return { data: row };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("daily_attendance")
    .upsert(
      { student_id: studentId, attendance_date: today, present: true, marked_by: staff.id, arrival_time: now, picked_up_by: pickedUpBy ?? null },
      { onConflict: "student_id,attendance_date" }
    )
    .select()
    .single();

  if (error) return { error: "Could not log arrival." };
  revalidatePath("/dashboard/secretary/attendance");
  return { data };
}

export async function markDeparture(studentId: string, pickedUpBy?: string) {
  const staff = await getEffectiveStaff();
  if (!staff) return { error: "Not authenticated" };

  const today = new Date().toISOString().slice(0, 10);
  const now = nowIso();

  if (isLocalMode()) {
    const db = getLocalDb();
    const existing = db
      .prepare(`SELECT id FROM daily_attendance WHERE student_id = ? AND attendance_date = ?`)
      .get(studentId, today) as { id: string } | undefined;

    if (!existing) return { error: "No arrival logged for this student today yet." };

    writeWithSync(
      "daily_attendance",
      existing.id,
      "update",
      { id: existing.id, departure_time: now, picked_up_by: pickedUpBy ?? null, updated_at: now },
      (db) => {
        db.prepare(
          `UPDATE daily_attendance SET departure_time = ?, picked_up_by = COALESCE(?, picked_up_by), updated_at = ? WHERE id = ?`
        ).run(now, pickedUpBy ?? null, now, existing.id);
      }
    );

    revalidatePath("/dashboard/secretary/attendance");
    return { success: true };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("daily_attendance")
    .update({ departure_time: now, picked_up_by: pickedUpBy ?? null })
    .eq("student_id", studentId)
    .eq("attendance_date", today);

  if (error) return { error: "Could not log departure." };
  revalidatePath("/dashboard/secretary/attendance");
  return { success: true };
}

export async function getTodayArrivalsAndDepartures() {
  const today = new Date().toISOString().slice(0, 10);

  if (isLocalMode()) {
    const db = getLocalDb();
    const rows = db
      .prepare(
        `SELECT da.*, s.full_name as student_name, c.name as class_name
         FROM daily_attendance da
         JOIN students s ON s.id = da.student_id
         LEFT JOIN classes c ON c.id = s.class_id
         WHERE da.attendance_date = ? AND da.deleted = 0
         ORDER BY s.full_name`
      )
      .all(today) as any[];
    return rows.map((r) => ({ ...r, student: { full_name: r.student_name, class: { name: r.class_name } } }));
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("daily_attendance")
    .select("*, student:students(full_name, class:classes(name))")
    .eq("attendance_date", today)
    .order("student_id");
  return data ?? [];
}

// --- Teacher: daily present/absent marking ---

export async function getTodayRosterWithAttendance(classId: string) {
  const today = new Date().toISOString().slice(0, 10);

  if (isLocalMode()) {
    const db = getLocalDb();
    const students = db
      .prepare(`SELECT id, full_name FROM students WHERE class_id = ? AND status = 'active' AND deleted = 0 ORDER BY full_name`)
      .all(classId) as { id: string; full_name: string }[];

    const attendance = db
      .prepare(`SELECT student_id, present FROM daily_attendance WHERE attendance_date = ?`)
      .all(today) as { student_id: string; present: number }[];

    const attendanceMap = new Map(attendance.map((a) => [a.student_id, a.present]));

    return students.map((s) => ({
      id: s.id,
      full_name: s.full_name,
      present: attendanceMap.has(s.id) ? attendanceMap.get(s.id) === 1 : true,
    }));
  }

  const supabase = await createClient();
  const { data: students } = await supabase
    .from("students")
    .select("id, full_name")
    .eq("class_id", classId)
    .eq("status", "active")
    .order("full_name");

  const { data: attendance } = await supabase
    .from("daily_attendance")
    .select("student_id, present")
    .eq("attendance_date", today)
    .in("student_id", (students ?? []).map((s) => s.id));

  const attendanceMap = new Map((attendance ?? []).map((a) => [a.student_id, a.present]));

  return (students ?? []).map((s) => ({
    id: s.id,
    full_name: s.full_name,
    present: attendanceMap.get(s.id) ?? true,
  }));
}

export async function markDailyAttendance(records: { studentId: string; present: boolean }[]) {
  const staff = await getEffectiveStaff();
  if (!staff) return { error: "Not authenticated" };

  const today = new Date().toISOString().slice(0, 10);

  if (isLocalMode()) {
    const db = getLocalDb();
    const now = nowIso();

    for (const r of records) {
      const existing = db
        .prepare(`SELECT id FROM daily_attendance WHERE student_id = ? AND attendance_date = ?`)
        .get(r.studentId, today) as { id: string } | undefined;

      const id = existing?.id ?? newId();
      const row = {
        id,
        student_id: r.studentId,
        attendance_date: today,
        present: r.present ? 1 : 0,
        marked_by: staff.id,
        created_at: now,
        updated_at: now,
      };

      writeWithSync("daily_attendance", id, existing ? "update" : "insert", row, (db) => {
        db.prepare(
          `INSERT INTO daily_attendance (id, student_id, attendance_date, present, marked_by, created_at, updated_at)
           VALUES (@id, @student_id, @attendance_date, @present, @marked_by, @created_at, @updated_at)
           ON CONFLICT(student_id, attendance_date) DO UPDATE SET present = excluded.present, updated_at = excluded.updated_at`
        ).run(row);
      });
    }

    revalidatePath("/dashboard/teacher/attendance");
    return { success: true };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("daily_attendance").upsert(
    records.map((r) => ({ student_id: r.studentId, attendance_date: today, present: r.present, marked_by: staff.id })),
    { onConflict: "student_id,attendance_date" }
  );

  if (error) return { error: "Could not save attendance." };

  revalidatePath("/dashboard/teacher/attendance");
  return { success: true };
}
