"use server";

import { createClient } from "@/lib/supabase/server";
import { getLocalDb, newId, nowIso, writeWithSync } from "@/lib/db/local";
import { getEffectiveStaff } from "@/lib/data/currentStaff";
import { isLocalMode } from "@/lib/data/mode";
import { revalidatePath } from "next/cache";

export async function listSubjects() {
  if (isLocalMode()) {
    const db = getLocalDb();
    return db.prepare(`SELECT * FROM subjects WHERE deleted = 0 ORDER BY name`).all();
  }
  const supabase = await createClient();
  const { data } = await supabase.from("subjects").select("*").order("name");
  return data ?? [];
}

export async function createSubject(name: string, level?: string) {
  const staff = await getEffectiveStaff();
  if (!staff) return { error: "Not authenticated" };

  if (isLocalMode()) {
    const db = getLocalDb();
    const id = newId();
    const now = nowIso();
    const row = { id, name, level: level ?? null, created_at: now, updated_at: now };
    writeWithSync("subjects", id, "insert", row, (db) => {
      db.prepare(`INSERT INTO subjects (id, name, level, created_at, updated_at) VALUES (@id, @name, @level, @created_at, @updated_at)`).run(row);
    });
    revalidatePath("/dashboard/teacher/gradebook");
    return { data: row };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("subjects").insert({ name, level: level ?? null }).select().single();
  if (error) return { error: "Could not create subject." };
  revalidatePath("/dashboard/teacher/gradebook");
  return { data };
}

export async function listAssessments(classId: string) {
  if (isLocalMode()) {
    const db = getLocalDb();
    const rows = db
      .prepare(
        `SELECT a.*, sub.name as subject_name
         FROM assessments a LEFT JOIN subjects sub ON sub.id = a.subject_id
         WHERE a.class_id = ? AND a.deleted = 0 ORDER BY a.assessment_date DESC`
      )
      .all(classId) as any[];
    return rows.map((r) => ({ ...r, subject: { name: r.subject_name } }));
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("assessments")
    .select("*, subject:subjects(name)")
    .eq("class_id", classId)
    .order("assessment_date", { ascending: false });
  return data ?? [];
}

export async function createAssessment(input: {
  classId: string;
  subjectId: string;
  title: string;
  term: string;
  maxScore: number;
}) {
  const staff = await getEffectiveStaff();
  if (!staff) return { error: "Not authenticated" };

  if (isLocalMode()) {
    const db = getLocalDb();
    const id = newId();
    const now = nowIso();
    const row = {
      id,
      class_id: input.classId,
      subject_id: input.subjectId,
      title: input.title,
      term: input.term,
      max_score: input.maxScore,
      weight: 1,
      assessment_date: now.slice(0, 10),
      created_by: staff.id,
      created_at: now,
      updated_at: now,
    };

    writeWithSync("assessments", id, "insert", row, (db) => {
      db.prepare(
        `INSERT INTO assessments (id, class_id, subject_id, title, term, max_score, weight, assessment_date, created_by, created_at, updated_at)
         VALUES (@id, @class_id, @subject_id, @title, @term, @max_score, @weight, @assessment_date, @created_by, @created_at, @updated_at)`
      ).run(row);
    });

    revalidatePath("/dashboard/teacher/gradebook");
    return { data: row };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assessments")
    .insert({ class_id: input.classId, subject_id: input.subjectId, title: input.title, term: input.term, max_score: input.maxScore, created_by: staff.id })
    .select()
    .single();

  if (error) return { error: "Could not create assessment." };
  revalidatePath("/dashboard/teacher/gradebook");
  return { data };
}

export async function getRosterWithGrades(classId: string, assessmentId: string) {
  if (isLocalMode()) {
    const db = getLocalDb();
    const students = db
      .prepare(`SELECT id, full_name FROM students WHERE class_id = ? AND status = 'active' AND deleted = 0 ORDER BY full_name`)
      .all(classId) as { id: string; full_name: string }[];

    const grades = db
      .prepare(`SELECT student_id, score FROM grades WHERE assessment_id = ? AND deleted = 0`)
      .all(assessmentId) as { student_id: string; score: number }[];

    const gradeMap = new Map(grades.map((g) => [g.student_id, g.score]));
    return students.map((s) => ({ id: s.id, full_name: s.full_name, score: gradeMap.get(s.id) ?? null }));
  }

  const supabase = await createClient();
  const { data: students } = await supabase
    .from("students")
    .select("id, full_name")
    .eq("class_id", classId)
    .eq("status", "active")
    .order("full_name");

  const { data: grades } = await supabase.from("grades").select("student_id, score").eq("assessment_id", assessmentId);
  const gradeMap = new Map((grades ?? []).map((g) => [g.student_id, g.score]));

  return (students ?? []).map((s) => ({ id: s.id, full_name: s.full_name, score: gradeMap.get(s.id) ?? null }));
}

export async function saveGrades(assessmentId: string, records: { studentId: string; score: number }[]) {
  const staff = await getEffectiveStaff();
  if (!staff) return { error: "Not authenticated" };

  if (isLocalMode()) {
    const db = getLocalDb();
    const now = nowIso();

    for (const r of records) {
      const existing = db
        .prepare(`SELECT id FROM grades WHERE student_id = ? AND assessment_id = ?`)
        .get(r.studentId, assessmentId) as { id: string } | undefined;

      const id = existing?.id ?? newId();
      const row = { id, student_id: r.studentId, assessment_id: assessmentId, score: r.score, entered_by: staff.id, created_at: now, updated_at: now };

      writeWithSync("grades", id, existing ? "update" : "insert", row, (db) => {
        db.prepare(
          `INSERT INTO grades (id, student_id, assessment_id, score, entered_by, created_at, updated_at)
           VALUES (@id, @student_id, @assessment_id, @score, @entered_by, @created_at, @updated_at)
           ON CONFLICT(student_id, assessment_id) DO UPDATE SET score = excluded.score, updated_at = excluded.updated_at`
        ).run(row);
      });
    }

    revalidatePath("/dashboard/teacher/gradebook");
    return { success: true };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("grades").upsert(
    records.map((r) => ({ student_id: r.studentId, assessment_id: assessmentId, score: r.score, entered_by: staff.id })),
    { onConflict: "student_id,assessment_id" }
  );

  if (error) return { error: "Could not save grades." };
  revalidatePath("/dashboard/teacher/gradebook");
  return { success: true };
}

export async function getStudentGradesForTerm(studentId: string, term: string) {
  if (isLocalMode()) {
    const db = getLocalDb();
    const rows = db
      .prepare(
        `SELECT sub.name as subject, a.title, g.score, a.max_score
         FROM grades g
         JOIN assessments a ON a.id = g.assessment_id
         JOIN subjects sub ON sub.id = a.subject_id
         WHERE g.student_id = ? AND a.term = ? AND g.deleted = 0
         ORDER BY sub.name, a.assessment_date`
      )
      .all(studentId, term) as { subject: string; title: string; score: number; max_score: number }[];

    const average = rows.length > 0 ? Math.round((rows.reduce((s, r) => s + r.score / r.max_score, 0) / rows.length) * 100) : null;
    return { grades: rows, average };
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("grades")
    .select("score, assessment:assessments(title, term, max_score, subject:subjects(name))")
    .eq("student_id", studentId);

  const filtered = (data ?? []).filter((g: any) => g.assessment?.term === term);
  const rows = filtered.map((g: any) => ({
    subject: g.assessment.subject.name,
    title: g.assessment.title,
    score: g.score,
    max_score: g.assessment.max_score,
  }));
  const average = rows.length > 0 ? Math.round((rows.reduce((s, r) => s + r.score / r.max_score, 0) / rows.length) * 100) : null;
  return { grades: rows, average };
}

export async function getStudentTermAverage(studentId: string, term: string) {
  if (isLocalMode()) {
    const db = getLocalDb();
    const rows = db
      .prepare(
        `SELECT g.score, a.max_score FROM grades g
         JOIN assessments a ON a.id = g.assessment_id
         WHERE g.student_id = ? AND a.term = ? AND g.deleted = 0`
      )
      .all(studentId, term) as { score: number; max_score: number }[];

    if (rows.length === 0) return null;
    const pctSum = rows.reduce((sum, r) => sum + r.score / r.max_score, 0);
    return Math.round((pctSum / rows.length) * 100);
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("grades")
    .select("score, assessment:assessments(max_score, term)")
    .eq("student_id", studentId);

  const filtered = (data ?? []).filter((g: any) => g.assessment?.term === term);
  if (filtered.length === 0) return null;
  const pctSum = filtered.reduce((sum: number, g: any) => sum + g.score / g.assessment.max_score, 0);
  return Math.round((pctSum / filtered.length) * 100);
}
