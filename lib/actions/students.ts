"use server";

import { createClient } from "@/lib/supabase/server";
import { getLocalDb, newId, nowIso, writeWithSync } from "@/lib/db/local";
import { getEffectiveStaff } from "@/lib/data/currentStaff";
import { isLocalMode } from "@/lib/data/mode";
import { revalidatePath } from "next/cache";

export async function listStudents(filterClassId?: string) {
  if (isLocalMode()) {
    const db = getLocalDb();
    const rows = db
      .prepare(
        `SELECT s.*, c.id as class_id_join, c.name as class_name,
                p.id as parent_row_id, p.full_name as parent_name, p.phone_primary
         FROM students s
         LEFT JOIN classes c ON c.id = s.class_id
         LEFT JOIN parents p ON p.id = s.parent_id
         WHERE s.status = 'active' AND s.deleted = 0
         ${filterClassId ? "AND s.class_id = @classId" : ""}
         ORDER BY s.full_name`
      )
      .all(filterClassId ? { classId: filterClassId } : {}) as any[];

    return rows.map((r) => ({
      ...r,
      class: r.class_name ? { id: r.class_id_join, name: r.class_name } : null,
      parent: r.parent_name ? { id: r.parent_row_id, full_name: r.parent_name, phone_primary: r.phone_primary } : null,
    }));
  }

  const supabase = await createClient();
  let query = supabase
    .from("students")
    .select("*, class:classes(id, name), parent:parents(id, full_name, phone_primary)")
    .eq("status", "active")
    .order("full_name");

  if (filterClassId) query = query.eq("class_id", filterClassId);

  const { data } = await query;
  return data ?? [];
}

export type CreateStudentInput = {
  fullName: string;
  age: number;
  sex: "M" | "F";
  classId: string;
  parentName: string;
  parentPhonePrimary: string;
  parentPhoneSecondary?: string;
  totalFeeDue?: number;
};

export async function createStudent(input: CreateStudentInput) {
  const staff = await getEffectiveStaff();
  if (!staff) return { error: "Not authenticated" };

  if (isLocalMode()) {
    const db = getLocalDb();
    const now = nowIso();

    let parentId: string;
    const existingParent = db
      .prepare(`SELECT id FROM parents WHERE phone_primary = ? AND deleted = 0`)
      .get(input.parentPhonePrimary) as { id: string } | undefined;

    if (existingParent) {
      parentId = existingParent.id;
    } else {
      parentId = newId();
      const parentRow = {
        id: parentId,
        full_name: input.parentName,
        phone_primary: input.parentPhonePrimary,
        phone_secondary: input.parentPhoneSecondary || null,
        created_at: now,
        updated_at: now,
      };
      writeWithSync("parents", parentId, "insert", parentRow, (db) => {
        db.prepare(
          `INSERT INTO parents (id, full_name, phone_primary, phone_secondary, created_at, updated_at)
           VALUES (@id, @full_name, @phone_primary, @phone_secondary, @created_at, @updated_at)`
        ).run(parentRow);
      });
    }

    const studentId = newId();
    const qrCode = studentId.slice(0, 16);
    const studentRow = {
      id: studentId,
      full_name: input.fullName,
      age: input.age,
      sex: input.sex,
      class_id: input.classId,
      parent_id: parentId,
      qr_code: qrCode,
      enrolled_date: now.slice(0, 10),
      status: "active",
      total_fee_due: input.totalFeeDue ?? 0,
      academic_year: "2026-2027",
      created_at: now,
      updated_at: now,
    };

    writeWithSync("students", studentId, "insert", studentRow, (db) => {
      db.prepare(
        `INSERT INTO students (id, full_name, age, sex, class_id, parent_id, qr_code, enrolled_date, status, total_fee_due, academic_year, created_at, updated_at)
         VALUES (@id, @full_name, @age, @sex, @class_id, @parent_id, @qr_code, @enrolled_date, @status, @total_fee_due, @academic_year, @created_at, @updated_at)`
      ).run(studentRow);
    });

    const auditId = newId();
    writeWithSync(
      "audit_log",
      auditId,
      "insert",
      { id: auditId, actor_id: staff.id, action: "student_enrolled", entity: "students", entity_id: studentId, details: JSON.stringify({ full_name: input.fullName, class_id: input.classId }), created_at: now },
      (db) => {
        db.prepare(
          `INSERT INTO audit_log (id, actor_id, action, entity, entity_id, details, created_at)
           VALUES (?, ?, 'student_enrolled', 'students', ?, ?, ?)`
        ).run(auditId, staff.id, studentId, JSON.stringify({ full_name: input.fullName, class_id: input.classId }), now);
      }
    );

    revalidatePath("/dashboard/secretary/students");
    return { data: studentRow };
  }

  // ---- Cloud mode ----
  const supabase = await createClient();

  let parentId: string;
  const { data: existingParent } = await supabase
    .from("parents")
    .select("id")
    .eq("phone_primary", input.parentPhonePrimary)
    .maybeSingle();

  if (existingParent) {
    parentId = existingParent.id;
  } else {
    const { data: newParent, error: parentError } = await supabase
      .from("parents")
      .insert({
        full_name: input.parentName,
        phone_primary: input.parentPhonePrimary,
        phone_secondary: input.parentPhoneSecondary || null,
      })
      .select()
      .single();

    if (parentError || !newParent) return { error: "Could not save parent record." };
    parentId = newParent.id;
  }

  const { data: student, error } = await supabase
    .from("students")
    .insert({
      full_name: input.fullName,
      age: input.age,
      sex: input.sex,
      class_id: input.classId,
      parent_id: parentId,
      total_fee_due: input.totalFeeDue ?? 0,
    })
    .select()
    .single();

  if (error) {
    console.error("createStudent error:", error.message);
    return { error: "Could not create student record." };
  }

  await supabase.from("audit_log").insert({
    actor_id: staff.id,
    action: "student_enrolled",
    entity: "students",
    entity_id: student.id,
    details: { full_name: input.fullName, class_id: input.classId },
  });

  revalidatePath("/dashboard/secretary/students");
  return { data: student };
}

export async function updateStudentPhoto(studentId: string, photoDataUrl: string) {
  const staff = await getEffectiveStaff();
  if (!staff) return { error: "Not authenticated" };

  // Photos are stored as compressed data-URLs directly in photo_url (resized
  // client-side to a small JPEG before this is called) rather than a separate
  // file-storage bucket. This keeps local (SQLite) and cloud (Supabase) modes
  // identical — no extra storage infrastructure needed for a few KB per photo.
  if (isLocalMode()) {
    const db = getLocalDb();
    const now = nowIso();
    writeWithSync("students", studentId, "update", { id: studentId, photo_url: photoDataUrl, updated_at: now }, (db) => {
      db.prepare(`UPDATE students SET photo_url = ?, updated_at = ? WHERE id = ?`).run(photoDataUrl, now, studentId);
    });
    revalidatePath("/dashboard/secretary/students");
    return { success: true };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("students").update({ photo_url: photoDataUrl }).eq("id", studentId);
  if (error) return { error: "Could not save photo." };
  revalidatePath("/dashboard/secretary/students");
  return { success: true };
}

export async function getClassesForDropdown() {
  if (isLocalMode()) {
    const db = getLocalDb();
    return db.prepare(`SELECT id, name FROM classes WHERE deleted = 0 ORDER BY name`).all();
  }

  const supabase = await createClient();
  const { data } = await supabase.from("classes").select("id, name").order("name");
  return data ?? [];
}
