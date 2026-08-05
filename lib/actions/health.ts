"use server";

import { createClient } from "@/lib/supabase/server";
import { getLocalDb, newId, nowIso, writeWithSync } from "@/lib/db/local";
import { getEffectiveStaff } from "@/lib/data/currentStaff";
import { isLocalMode } from "@/lib/data/mode";
import { revalidatePath } from "next/cache";

export async function getHealthRecord(studentId: string) {
  if (isLocalMode()) {
    const db = getLocalDb();
    const row = db.prepare(`SELECT * FROM health_records WHERE student_id = ? AND deleted = 0`).get(studentId) as any;
    if (row?.immunizations) row.immunizations = JSON.parse(row.immunizations);
    return row ?? null;
  }

  const supabase = await createClient();
  const { data } = await supabase.from("health_records").select("*").eq("student_id", studentId).maybeSingle();
  return data;
}
export type HealthRecordInput = {
  studentId: string;
  allergies?: string;
  conditions?: string;
  medications?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  bloodType?: string;
  notes?: string;
};

export async function upsertHealthRecord(input: HealthRecordInput) {
  const staff = await getEffectiveStaff();
  if (!staff) return { error: "Not authenticated" };

  if (isLocalMode()) {
    const db = getLocalDb();
    const now = nowIso();

    const existing = db
      .prepare(`SELECT id FROM health_records WHERE student_id = ?`)
      .get(input.studentId) as { id: string } | undefined;

    const id = existing?.id ?? newId();
    const row = {
      id,
      student_id: input.studentId,
      allergies: input.allergies ?? null,
      conditions: input.conditions ?? null,
      medications: input.medications ?? null,
      emergency_contact_name: input.emergencyContactName ?? null,
      emergency_contact_phone: input.emergencyContactPhone ?? null,
      blood_type: input.bloodType ?? null,
      notes: input.notes ?? null,
      updated_by: staff.id,
      created_at: now,
      updated_at: now,
    };

    writeWithSync("health_records", id, existing ? "update" : "insert", row, (db) => {
      db.prepare(
        `INSERT INTO health_records (id, student_id, allergies, conditions, medications, emergency_contact_name, emergency_contact_phone, blood_type, notes, updated_by, created_at, updated_at)
         VALUES (@id, @student_id, @allergies, @conditions, @medications, @emergency_contact_name, @emergency_contact_phone, @blood_type, @notes, @updated_by, @created_at, @updated_at)
         ON CONFLICT(student_id) DO UPDATE SET
           allergies = excluded.allergies, conditions = excluded.conditions, medications = excluded.medications,
           emergency_contact_name = excluded.emergency_contact_name, emergency_contact_phone = excluded.emergency_contact_phone,
           blood_type = excluded.blood_type, notes = excluded.notes, updated_by = excluded.updated_by, updated_at = excluded.updated_at`
      ).run(row);
    });

    revalidatePath("/dashboard/secretary/health");
    return { data: row };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("health_records")
    .upsert(
      {
        student_id: input.studentId,
        allergies: input.allergies ?? null,
        conditions: input.conditions ?? null,
        medications: input.medications ?? null,
        emergency_contact_name: input.emergencyContactName ?? null,
        emergency_contact_phone: input.emergencyContactPhone ?? null,
        blood_type: input.bloodType ?? null,
        notes: input.notes ?? null,
        updated_by: staff.id,
      },
      { onConflict: "student_id" }
    )
    .select()
    .single();

  if (error) return { error: "Could not save health record." };
  revalidatePath("/dashboard/secretary/health");
  return { data };
}

export type IncidentInput = {
  studentId: string;
  severity: "minor" | "moderate" | "serious";
  category: string;
  description: string;
  actionTaken?: string;
  parentNotified: boolean;
};

export async function createIncident(input: IncidentInput) {
  const staff = await getEffectiveStaff();
  if (!staff) return { error: "Not authenticated" };

  if (isLocalMode()) {
    const db = getLocalDb();
    const id = newId();
    const now = nowIso();
    const row = {
      id,
      student_id: input.studentId,
      reported_by: staff.id,
      incident_date: now.slice(0, 10),
      severity: input.severity,
      category: input.category,
      description: input.description,
      action_taken: input.actionTaken ?? null,
      parent_notified: input.parentNotified ? 1 : 0,
      created_at: now,
      updated_at: now,
    };

    writeWithSync("incidents", id, "insert", row, (db) => {
      db.prepare(
        `INSERT INTO incidents (id, student_id, reported_by, incident_date, severity, category, description, action_taken, parent_notified, created_at, updated_at)
         VALUES (@id, @student_id, @reported_by, @incident_date, @severity, @category, @description, @action_taken, @parent_notified, @created_at, @updated_at)`
      ).run(row);
    });

    revalidatePath("/dashboard/director/incidents");
    return { data: row };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("incidents")
    .insert({
      student_id: input.studentId,
      reported_by: staff.id,
      severity: input.severity,
      category: input.category,
      description: input.description,
      action_taken: input.actionTaken ?? null,
      parent_notified: input.parentNotified,
    })
    .select()
    .single();

  if (error) return { error: "Could not save incident report." };
  revalidatePath("/dashboard/director/incidents");
  return { data };
}

export async function listIncidents() {
  if (isLocalMode()) {
    const db = getLocalDb();
    const rows = db
      .prepare(
        `SELECT i.*, s.full_name as student_name, st.full_name as staff_name
         FROM incidents i
         LEFT JOIN students s ON s.id = i.student_id
         LEFT JOIN staff st ON st.id = i.reported_by
         WHERE i.deleted = 0
         ORDER BY i.created_at DESC`
      )
      .all() as any[];
    return rows.map((r) => ({ ...r, student: { full_name: r.student_name }, staff: { full_name: r.staff_name } }));
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("incidents")
    .select("*, student:students(full_name), staff:reported_by(full_name)")
    .order("created_at", { ascending: false });
  return data ?? [];
}
