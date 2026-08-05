"use server";

import { createClient } from "@/lib/supabase/server";
import { getLocalDb, newId, nowIso, writeWithSync } from "@/lib/db/local";
import { getEffectiveStaff } from "@/lib/data/currentStaff";
import { isLocalMode } from "@/lib/data/mode";
import { generateReportCardComment, generateFlyerCopy } from "@/lib/ai/openrouter";
import { getStudentGradesForTerm } from "@/lib/actions/gradebook";
import { revalidatePath } from "next/cache";

export async function bulkGenerateReportCards(input: {
  classId: string;
  termLabel: string;
  strengths: string;
  areasToImprove: string;
}) {
  const staff = await getEffectiveStaff();
  if (!staff) return { error: "Not authenticated" };

  let students: { id: string; full_name: string; level: string | null }[];

  if (isLocalMode()) {
    const db = getLocalDb();
    students = db
      .prepare(
        `SELECT s.id, s.full_name, c.level FROM students s LEFT JOIN classes c ON c.id = s.class_id
         WHERE s.class_id = ? AND s.status = 'active' AND s.deleted = 0 ORDER BY s.full_name`
      )
      .all(input.classId) as any[];
  } else {
    const supabase = await createClient();
    const { data } = await supabase
      .from("students")
      .select("id, full_name, class:classes(level)")
      .eq("class_id", input.classId)
      .eq("status", "active");
    students = (data ?? []).map((s: any) => ({ id: s.id, full_name: s.full_name, level: s.class?.level ?? null }));
  }

  if (students.length === 0) return { error: "No active students in this class." };

  let successCount = 0;
  const documentIds: string[] = [];

  for (const s of students) {
    const result = await createReportCard({
      studentId: s.id,
      studentName: s.full_name,
      level: s.level ?? "",
      termLabel: input.termLabel,
      strengths: input.strengths,
      areasToImprove: input.areasToImprove,
    });
    if (result.data) {
      successCount++;
      documentIds.push((result.data as any).id);
    }
  }

  return { successCount, total: students.length, documentIds };
}

export async function getStudentsForDropdown() {
  if (isLocalMode()) {
    const db = getLocalDb();
    const rows = db
      .prepare(
        `SELECT s.id, s.full_name, c.name as class_name, c.level
         FROM students s LEFT JOIN classes c ON c.id = s.class_id
         WHERE s.status = 'active' AND s.deleted = 0 ORDER BY s.full_name`
      )
      .all() as any[];
    return rows.map((r) => ({ id: r.id, full_name: r.full_name, class: { name: r.class_name, level: r.level } }));
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("students")
    .select("id, full_name, class:classes(name, level)")
    .eq("status", "active")
    .order("full_name");
  return data ?? [];
}

export async function createReportCard(input: {
  studentId: string;
  studentName: string;
  level: string;
  termLabel: string;
  strengths: string;
  areasToImprove: string;
}) {
  const staff = await getEffectiveStaff();
  if (!staff) return { error: "Not authenticated" };

  // Requires internet; returns null gracefully if offline or not configured,
  // and we fall back to the teacher's raw notes either way.
  const comment = await generateReportCardComment({
    studentName: input.studentName,
    level: input.level,
    strengths: input.strengths,
    areasToImprove: input.areasToImprove,
    termLabel: input.termLabel,
  });

  const finalComment =
    comment ?? `${input.strengths}${input.areasToImprove ? " — " + input.areasToImprove : ""}`;

  const { grades, average } = await getStudentGradesForTerm(input.studentId, input.termLabel);
  const gradesSnapshot = JSON.stringify({ grades, average });

  if (isLocalMode()) {
    const db = getLocalDb();
    const id = newId();
    const now = nowIso();
    const row = {
      id,
      student_id: input.studentId,
      doc_type: "report_card",
      academic_year: "2026-2027",
      term: input.termLabel,
      generated_by: staff.id,
      ai_generated_comment: finalComment,
      grades_snapshot: gradesSnapshot,
      created_at: now,
      updated_at: now,
    };

    writeWithSync("documents_generated", id, "insert", row, (db) => {
      db.prepare(
        `INSERT INTO documents_generated (id, student_id, doc_type, academic_year, term, generated_by, ai_generated_comment, grades_snapshot, created_at, updated_at)
         VALUES (@id, @student_id, @doc_type, @academic_year, @term, @generated_by, @ai_generated_comment, @grades_snapshot, @created_at, @updated_at)`
      ).run(row);
    });

    const auditId = newId();
    writeWithSync(
      "audit_log",
      auditId,
      "insert",
      { id: auditId, actor_id: staff.id, action: "report_card_generated", entity: "documents_generated", entity_id: id, created_at: now },
      (db) => {
        db.prepare(
          `INSERT INTO audit_log (id, actor_id, action, entity, entity_id, created_at) VALUES (?, ?, 'report_card_generated', 'documents_generated', ?, ?)`
        ).run(auditId, staff.id, id, now);
      }
    );

    revalidatePath("/dashboard/secretary/documents");
    return { data: row, aiAvailable: !!comment };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents_generated")
    .insert({ student_id: input.studentId, doc_type: "report_card", term: input.termLabel, generated_by: staff.id, ai_generated_comment: finalComment, grades_snapshot: { grades, average } })
    .select()
    .single();

  if (error) return { error: "Could not save report card." };

  await supabase.from("audit_log").insert({
    actor_id: staff.id,
    action: "report_card_generated",
    entity: "documents_generated",
    entity_id: data.id,
  });

  revalidatePath("/dashboard/secretary/documents");
  return { data, aiAvailable: !!comment };
}

export async function getDocument(id: string) {
  if (isLocalMode()) {
    const db = getLocalDb();
    const row = db
      .prepare(
        `SELECT d.*, s.full_name as student_name, s.age, s.sex, s.qr_code, s.photo_url, c.name as class_name, c.level
         FROM documents_generated d
         LEFT JOIN students s ON s.id = d.student_id
         LEFT JOIN classes c ON c.id = s.class_id
         WHERE d.id = ?`
      )
      .get(id) as any;

    if (!row) return null;
    return {
      ...row,
      grades_snapshot: row.grades_snapshot ? JSON.parse(row.grades_snapshot) : null,
      student: {
        full_name: row.student_name,
        age: row.age,
        sex: row.sex,
        qr_code: row.qr_code,
        photo_url: row.photo_url,
        class: { name: row.class_name, level: row.level },
      },
    };
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("documents_generated")
    .select("*, student:students(full_name, age, sex, qr_code, photo_url, class:classes(name, level))")
    .eq("id", id)
    .single();
  return data;
}

export async function createIdCard(studentId: string) {
  const staff = await getEffectiveStaff();
  if (!staff) return { error: "Not authenticated" };

  if (isLocalMode()) {
    const db = getLocalDb();
    const id = newId();
    const now = nowIso();
    const row = { id, student_id: studentId, doc_type: "id_card", generated_by: staff.id, created_at: now, updated_at: now };

    writeWithSync("documents_generated", id, "insert", row, (db) => {
      db.prepare(
        `INSERT INTO documents_generated (id, student_id, doc_type, generated_by, created_at, updated_at)
         VALUES (@id, @student_id, @doc_type, @generated_by, @created_at, @updated_at)`
      ).run(row);
    });

    revalidatePath("/dashboard/secretary/documents");
    return { data: row };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents_generated")
    .insert({ student_id: studentId, doc_type: "id_card", generated_by: staff.id })
    .select()
    .single();

  if (error) return { error: "Could not generate ID card." };
  revalidatePath("/dashboard/secretary/documents");
  return { data };
}

export async function createCertificate(input: {
  studentId: string;
  certType: "attestation" | "certificate";
  occasion: string;
}) {
  const staff = await getEffectiveStaff();
  if (!staff) return { error: "Not authenticated" };

  if (isLocalMode()) {
    const db = getLocalDb();
    const id = newId();
    const now = nowIso();
    const row = { id, student_id: input.studentId, doc_type: input.certType, term: input.occasion, generated_by: staff.id, created_at: now, updated_at: now };

    writeWithSync("documents_generated", id, "insert", row, (db) => {
      db.prepare(
        `INSERT INTO documents_generated (id, student_id, doc_type, term, generated_by, created_at, updated_at)
         VALUES (@id, @student_id, @doc_type, @term, @generated_by, @created_at, @updated_at)`
      ).run(row);
    });

    revalidatePath("/dashboard/secretary/documents");
    return { data: row };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents_generated")
    .insert({ student_id: input.studentId, doc_type: input.certType, generated_by: staff.id, term: input.occasion })
    .select()
    .single();

  if (error) return { error: "Could not generate document." };
  revalidatePath("/dashboard/secretary/documents");
  return { data };
}

export async function draftFlyer(occasion: string, details: string) {
  const copy = await generateFlyerCopy({ occasion, details });
  if (!copy) return { error: "Could not draft flyer copy right now (needs internet). Please write it manually." };
  return { copy };
}

export async function getRecentDocuments(limit = 15) {
  if (isLocalMode()) {
    const db = getLocalDb();
    const rows = db
      .prepare(
        `SELECT d.*, s.full_name as student_name
         FROM documents_generated d LEFT JOIN students s ON s.id = d.student_id
         WHERE d.deleted = 0 ORDER BY d.created_at DESC LIMIT ?`
      )
      .all(limit) as any[];
    return rows.map((r) => ({ ...r, student: { full_name: r.student_name } }));
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("documents_generated")
    .select("*, student:students(full_name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}
