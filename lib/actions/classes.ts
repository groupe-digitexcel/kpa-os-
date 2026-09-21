"use server";

import { createClient } from "@/lib/supabase/server";
import { getLocalDb, newId, nowIso, writeWithSync } from "@/lib/db/local";
import { getEffectiveStaff } from "@/lib/data/currentStaff";
import { isLocalMode } from "@/lib/data/mode";
import { revalidatePath } from "next/cache";

export async function listClasses() {
  if (isLocalMode()) {
    const db = getLocalDb();
    const rows = db
      .prepare(
        `SELECT c.*, st.full_name as teacher_name,
                (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id AND s.status = 'active' AND s.deleted = 0) as student_count
         FROM classes c
         LEFT JOIN staff st ON st.id = c.teacher_id
         WHERE c.deleted = 0
         ORDER BY c.subsystem, c.level`
      )
      .all() as any[];

    return rows.map((r) => ({
      ...r,
      teacher: r.teacher_name ? { full_name: r.teacher_name } : null,
      students: [{ count: r.student_count }],
    }));
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("classes")
    .select("*, teacher:staff(full_name), students(count)")
    .order("subsystem")
    .order("level");
  return data ?? [];
}

export async function listTeachers() {
  if (isLocalMode()) {
    const db = getLocalDb();
    return db
      .prepare(`SELECT id, full_name FROM staff WHERE role = 'teacher' AND active = 1 AND deleted = 0`)
      .all();
  }

  const supabase = await createClient();
  const { data } = await supabase.from("staff").select("id, full_name").eq("role", "teacher").eq("active", true);
  return data ?? [];
}

export async function createClass(input: {
  name: string;
  subsystem: "anglophone" | "francophone";
  level: string;
  teacherId?: string;
}) {
  const staff = await getEffectiveStaff();
  if (!staff || (staff.role !== "director" && staff.role !== "super_admin")) {
    return { error: "Only the Director or Super Administrator can create classes." };
  }

  if (isLocalMode()) {
    const db = getLocalDb();
    const id = newId();
    const now = nowIso();
    const row = {
      id,
      name: input.name,
      subsystem: input.subsystem,
      level: input.level,
      academic_year: "2026-2027",
      teacher_id: input.teacherId || null,
      created_at: now,
      updated_at: now,
    };

    writeWithSync("classes", id, "insert", row, (db) => {
      db.prepare(
        `INSERT INTO classes (id, name, subsystem, level, academic_year, teacher_id, created_at, updated_at)
         VALUES (@id, @name, @subsystem, @level, @academic_year, @teacher_id, @created_at, @updated_at)`
      ).run(row);
    });

    const auditId = newId();
    writeWithSync(
      "audit_log",
      auditId,
      "insert",
      { id: auditId, actor_id: staff.id, action: "class_created", entity: "classes", entity_id: id, details: JSON.stringify(input), created_at: now },
      (db) => {
        db.prepare(
          `INSERT INTO audit_log (id, actor_id, action, entity, entity_id, details, created_at)
           VALUES (?, ?, 'class_created', 'classes', ?, ?, ?)`
        ).run(auditId, staff.id, id, JSON.stringify(input), now);
      }
    );

    revalidatePath("/dashboard/director/classes");
    return { data: row };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("classes")
    .insert({ name: input.name, subsystem: input.subsystem, level: input.level, teacher_id: input.teacherId || null })
    .select()
    .single();

  if (error) return { error: "Could not create class." };

  await supabase.from("audit_log").insert({
    actor_id: staff.id,
    action: "class_created",
    entity: "classes",
    entity_id: data.id,
    details: input,
  });

  revalidatePath("/dashboard/director/classes");
  return { data };
}
