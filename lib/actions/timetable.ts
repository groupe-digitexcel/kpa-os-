"use server";

import { createClient } from "@/lib/supabase/server";
import { getLocalDb, newId, nowIso, writeWithSync } from "@/lib/db/local";
import { getEffectiveStaff } from "@/lib/data/currentStaff";
import { isLocalMode } from "@/lib/data/mode";
import { revalidatePath } from "next/cache";

export async function getTimetableForClass(classId: string) {
  if (isLocalMode()) {
    const db = getLocalDb();
    const rows = db
      .prepare(
        `SELECT tp.*, sub.name as subject_name, st.full_name as teacher_name
         FROM timetable_periods tp
         LEFT JOIN subjects sub ON sub.id = tp.subject_id
         LEFT JOIN staff st ON st.id = tp.teacher_id
         WHERE tp.class_id = ? AND tp.deleted = 0
         ORDER BY tp.day_of_week, tp.start_time`
      )
      .all(classId) as any[];
    return rows.map((r) => ({ ...r, subject: r.subject_name ? { name: r.subject_name } : null, teacher: r.teacher_name ? { full_name: r.teacher_name } : null }));
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("timetable_periods")
    .select("*, subject:subjects(name), teacher:staff(full_name)")
    .eq("class_id", classId)
    .order("day_of_week")
    .order("start_time");
  return data ?? [];
}

export type TimetablePeriodInput = {
  classId: string;
  subjectId?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  teacherId?: string;
  room?: string;
};

export async function createTimetablePeriod(input: TimetablePeriodInput) {
  const staff = await getEffectiveStaff();
  if (!staff || (staff.role !== "director" && staff.role !== "secretary")) {
    return { error: "Only the Director or Secretary can edit the timetable." };
  }

  if (isLocalMode()) {
    const db = getLocalDb();
    const id = newId();
    const now = nowIso();
    const row = {
      id,
      class_id: input.classId,
      subject_id: input.subjectId ?? null,
      day_of_week: input.dayOfWeek,
      start_time: input.startTime,
      end_time: input.endTime,
      teacher_id: input.teacherId ?? null,
      room: input.room ?? null,
      academic_year: "2026-2027",
      created_at: now,
      updated_at: now,
    };

    writeWithSync("timetable_periods", id, "insert", row, (db) => {
      db.prepare(
        `INSERT INTO timetable_periods (id, class_id, subject_id, day_of_week, start_time, end_time, teacher_id, room, academic_year, created_at, updated_at)
         VALUES (@id, @class_id, @subject_id, @day_of_week, @start_time, @end_time, @teacher_id, @room, @academic_year, @created_at, @updated_at)`
      ).run(row);
    });

    revalidatePath("/dashboard/director/timetable");
    return { data: row };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("timetable_periods")
    .insert({
      class_id: input.classId,
      subject_id: input.subjectId ?? null,
      day_of_week: input.dayOfWeek,
      start_time: input.startTime,
      end_time: input.endTime,
      teacher_id: input.teacherId ?? null,
      room: input.room ?? null,
    })
    .select()
    .single();

  if (error) return { error: "Could not add timetable period." };
  revalidatePath("/dashboard/director/timetable");
  return { data };
}

export async function deleteTimetablePeriod(id: string) {
  const staff = await getEffectiveStaff();
  if (!staff || (staff.role !== "director" && staff.role !== "secretary")) {
    return { error: "Only the Director or Secretary can edit the timetable." };
  }

  if (isLocalMode()) {
    const db = getLocalDb();
    const now = nowIso();
    writeWithSync("timetable_periods", id, "delete", { id }, (db) => {
      db.prepare(`UPDATE timetable_periods SET deleted = 1, updated_at = ? WHERE id = ?`).run(now, id);
    });
    revalidatePath("/dashboard/director/timetable");
    return { success: true };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("timetable_periods").delete().eq("id", id);
  if (error) return { error: "Could not delete period." };
  revalidatePath("/dashboard/director/timetable");
  return { success: true };
}

// Used by the teacher's own timetable view.
export async function getMyTimetable(teacherId: string) {
  if (isLocalMode()) {
    const db = getLocalDb();
    const rows = db
      .prepare(
        `SELECT tp.*, sub.name as subject_name, c.name as class_name
         FROM timetable_periods tp
         LEFT JOIN subjects sub ON sub.id = tp.subject_id
         LEFT JOIN classes c ON c.id = tp.class_id
         WHERE tp.teacher_id = ? AND tp.deleted = 0
         ORDER BY tp.day_of_week, tp.start_time`
      )
      .all(teacherId) as any[];
    return rows.map((r) => ({ ...r, subject: { name: r.subject_name }, class: { name: r.class_name } }));
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("timetable_periods")
    .select("*, subject:subjects(name), class:classes(name)")
    .eq("teacher_id", teacherId)
    .order("day_of_week")
    .order("start_time");
  return data ?? [];
}
