"use server";

import { createClient } from "@/lib/supabase/server";
import { getLocalDb, newId, nowIso, writeWithSync } from "@/lib/db/local";
import { getEffectiveStaff } from "@/lib/data/currentStaff";
import { isLocalMode } from "@/lib/data/mode";
import { createStudent } from "@/lib/actions/students";
import { revalidatePath } from "next/cache";

export type AdmissionStatus = "inquiry" | "visit_scheduled" | "applied" | "waitlisted" | "accepted" | "enrolled" | "declined";

export async function listAdmissions() {
  if (isLocalMode()) {
    const db = getLocalDb();
    return db.prepare(`SELECT * FROM admissions WHERE deleted = 0 ORDER BY created_at DESC`).all();
  }

  const supabase = await createClient();
  const { data } = await supabase.from("admissions").select("*").order("created_at", { ascending: false });
  return data ?? [];
}

export type CreateAdmissionInput = {
  childFullName: string;
  age?: number;
  sex?: "M" | "F";
  desiredLevel?: string;
  desiredSubsystem?: "anglophone" | "francophone";
  parentName: string;
  parentPhone: string;
  parentEmail?: string;
  notes?: string;
};

export async function createAdmission(input: CreateAdmissionInput) {
  const staff = await getEffectiveStaff();
  if (!staff) return { error: "Not authenticated" };

  if (isLocalMode()) {
    const db = getLocalDb();
    const id = newId();
    const now = nowIso();
    const row = {
      id,
      child_full_name: input.childFullName,
      age: input.age ?? null,
      sex: input.sex ?? null,
      desired_level: input.desiredLevel ?? null,
      desired_subsystem: input.desiredSubsystem ?? null,
      parent_name: input.parentName,
      parent_phone: input.parentPhone,
      parent_email: input.parentEmail ?? null,
      status: "inquiry",
      inquiry_date: now.slice(0, 10),
      notes: input.notes ?? null,
      created_by: staff.id,
      created_at: now,
      updated_at: now,
    };

    writeWithSync("admissions", id, "insert", row, (db) => {
      db.prepare(
        `INSERT INTO admissions (id, child_full_name, age, sex, desired_level, desired_subsystem, parent_name, parent_phone, parent_email, status, inquiry_date, notes, created_by, created_at, updated_at)
         VALUES (@id, @child_full_name, @age, @sex, @desired_level, @desired_subsystem, @parent_name, @parent_phone, @parent_email, @status, @inquiry_date, @notes, @created_by, @created_at, @updated_at)`
      ).run(row);
    });

    revalidatePath("/dashboard/secretary/admissions");
    return { data: row };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("admissions")
    .insert({
      child_full_name: input.childFullName,
      age: input.age ?? null,
      sex: input.sex ?? null,
      desired_level: input.desiredLevel ?? null,
      desired_subsystem: input.desiredSubsystem ?? null,
      parent_name: input.parentName,
      parent_phone: input.parentPhone,
      parent_email: input.parentEmail ?? null,
      notes: input.notes ?? null,
      created_by: staff.id,
    })
    .select()
    .single();

  if (error) return { error: "Could not save inquiry." };
  revalidatePath("/dashboard/secretary/admissions");
  return { data };
}

export async function updateAdmissionStatus(id: string, status: AdmissionStatus, notes?: string) {
  const staff = await getEffectiveStaff();
  if (!staff) return { error: "Not authenticated" };

  if (isLocalMode()) {
    const db = getLocalDb();
    const now = nowIso();
    writeWithSync("admissions", id, "update", { id, status, notes: notes ?? null, updated_at: now }, (db) => {
      db.prepare(`UPDATE admissions SET status = ?, notes = COALESCE(?, notes), updated_at = ? WHERE id = ?`).run(status, notes ?? null, now, id);
    });
    revalidatePath("/dashboard/secretary/admissions");
    return { success: true };
  }

  const supabase = await createClient();
  const update: any = { status };
  if (notes) update.notes = notes;
  const { error } = await supabase.from("admissions").update(update).eq("id", id);
  if (error) return { error: "Could not update status." };
  revalidatePath("/dashboard/secretary/admissions");
  return { success: true };
}

// Converts an accepted applicant into a real enrolled student record, and
// marks the admission as "enrolled" with a link to the new student.
export async function convertAdmissionToStudent(admissionId: string, classId: string) {
  const staff = await getEffectiveStaff();
  if (!staff) return { error: "Not authenticated" };

  let admission: any;
  if (isLocalMode()) {
    const db = getLocalDb();
    admission = db.prepare(`SELECT * FROM admissions WHERE id = ?`).get(admissionId);
  } else {
    const supabase = await createClient();
    const { data } = await supabase.from("admissions").select("*").eq("id", admissionId).single();
    admission = data;
  }

  if (!admission) return { error: "Admission record not found." };

  const studentResult = await createStudent({
    fullName: admission.child_full_name,
    age: admission.age ?? 0,
    sex: (admission.sex ?? "M") as "M" | "F",
    classId,
    parentName: admission.parent_name,
    parentPhonePrimary: admission.parent_phone,
  });

  if (studentResult.error) return { error: studentResult.error };

  const studentId = (studentResult.data as any).id;

  if (isLocalMode()) {
    const db = getLocalDb();
    const now = nowIso();
    writeWithSync(
      "admissions",
      admissionId,
      "update",
      { id: admissionId, status: "enrolled", enrolled_student_id: studentId, updated_at: now },
      (db) => {
        db.prepare(`UPDATE admissions SET status = 'enrolled', enrolled_student_id = ?, updated_at = ? WHERE id = ?`).run(studentId, now, admissionId);
      }
    );
  } else {
    const supabase = await createClient();
    await supabase.from("admissions").update({ status: "enrolled", enrolled_student_id: studentId }).eq("id", admissionId);
  }

  revalidatePath("/dashboard/secretary/admissions");
  return { success: true, studentId };
}
