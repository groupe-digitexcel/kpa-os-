"use server";

import { createClient } from "@/lib/supabase/server";
import { getLocalDb, newId, nowIso, writeWithSync } from "@/lib/db/local";
import { getEffectiveStaff } from "@/lib/data/currentStaff";
import { isLocalMode } from "@/lib/data/mode";
import { revalidatePath } from "next/cache";

const ACADEMIC_YEAR = "2026-2027";

export async function listFeeStructures() {
  if (isLocalMode()) {
    const db = getLocalDb();
    return db
      .prepare(`SELECT * FROM fee_structure WHERE academic_year = ? AND deleted = 0 ORDER BY level`)
      .all(ACADEMIC_YEAR);
  }

  const supabase = await createClient();
  const { data } = await supabase.from("fee_structure").select("*").eq("academic_year", ACADEMIC_YEAR).order("level");
  return data ?? [];
}

export async function getFeeStructureForLevel(level: string) {
  if (isLocalMode()) {
    const db = getLocalDb();
    return db
      .prepare(`SELECT * FROM fee_structure WHERE level = ? AND academic_year = ? AND deleted = 0`)
      .get(level, ACADEMIC_YEAR) as any;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("fee_structure")
    .select("*")
    .eq("level", level)
    .eq("academic_year", ACADEMIC_YEAR)
    .maybeSingle();
  return data;
}

export type FeeStructureInput = {
  level: string;
  schoolFee: number;
  examFee: number;
  xmasPartyFee: number;
  endOfYearFee: number;
};

export async function upsertFeeStructure(input: FeeStructureInput) {
  const staff = await getEffectiveStaff();
  if (!staff || staff.role !== "director") return { error: "Only the Director can set fee amounts." };

  if (isLocalMode()) {
    const db = getLocalDb();
    const existing = db
      .prepare(`SELECT id FROM fee_structure WHERE level = ? AND academic_year = ?`)
      .get(input.level, ACADEMIC_YEAR) as { id: string } | undefined;

    const id = existing?.id ?? newId();
    const now = nowIso();
    const row = {
      id,
      level: input.level,
      academic_year: ACADEMIC_YEAR,
      school_fee: input.schoolFee,
      exam_fee: input.examFee,
      xmas_party_fee: input.xmasPartyFee,
      end_of_year_fee: input.endOfYearFee,
      created_at: now,
      updated_at: now,
    };

    writeWithSync("fee_structure", id, existing ? "update" : "insert", row, (db) => {
      db.prepare(
        `INSERT INTO fee_structure (id, level, academic_year, school_fee, exam_fee, xmas_party_fee, end_of_year_fee, created_at, updated_at)
         VALUES (@id, @level, @academic_year, @school_fee, @exam_fee, @xmas_party_fee, @end_of_year_fee, @created_at, @updated_at)
         ON CONFLICT(id) DO UPDATE SET school_fee = excluded.school_fee, exam_fee = excluded.exam_fee,
           xmas_party_fee = excluded.xmas_party_fee, end_of_year_fee = excluded.end_of_year_fee, updated_at = excluded.updated_at`
      ).run(row);
    });

    revalidatePath("/dashboard/director/fee-structure");
    return { data: row };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fee_structure")
    .upsert(
      {
        level: input.level,
        academic_year: ACADEMIC_YEAR,
        school_fee: input.schoolFee,
        exam_fee: input.examFee,
        xmas_party_fee: input.xmasPartyFee,
        end_of_year_fee: input.endOfYearFee,
      },
      { onConflict: "level,academic_year" }
    )
    .select()
    .single();

  if (error) return { error: "Could not save fee structure." };
  revalidatePath("/dashboard/director/fee-structure");
  return { data };
}

// Applies the level's school_fee as the starting balance for every active
// student at that level who hasn't had any payments recorded yet (so it
// won't clobber balances for students who've already started paying).
export async function applyFeeStructureToLevel(level: string) {
  const staff = await getEffectiveStaff();
  if (!staff || staff.role !== "director") return { error: "Only the Director can apply fee structures." };

  const structure = await getFeeStructureForLevel(level);
  if (!structure) return { error: "No fee structure set for this level yet." };

  if (isLocalMode()) {
    const db = getLocalDb();
    const now = nowIso();
    const students = db
      .prepare(
        `SELECT s.id FROM students s JOIN classes c ON c.id = s.class_id
         WHERE c.level = ? AND s.status = 'active' AND s.deleted = 0
         AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.student_id = s.id AND p.payment_type = 'school_fee')`
      )
      .all(level) as { id: string }[];

    for (const s of students) {
      writeWithSync("students", s.id, "update", { id: s.id, total_fee_due: structure.school_fee, updated_at: now }, (db) => {
        db.prepare(`UPDATE students SET total_fee_due = ?, updated_at = ? WHERE id = ?`).run(structure.school_fee, now, s.id);
      });
    }

    return { updatedCount: students.length };
  }

  const supabase = await createClient();
  const { data: classes } = await supabase.from("classes").select("id").eq("level", level);
  const classIds = (classes ?? []).map((c: any) => c.id);
  if (classIds.length === 0) return { updatedCount: 0 };

  const { data: students } = await supabase
    .from("students")
    .select("id")
    .in("class_id", classIds)
    .eq("status", "active");

  let updatedCount = 0;
  for (const s of students ?? []) {
    const { count } = await supabase
      .from("payments")
      .select("*", { count: "exact", head: true })
      .eq("student_id", s.id)
      .eq("payment_type", "school_fee");

    if (!count) {
      await supabase.from("students").update({ total_fee_due: structure.school_fee }).eq("id", s.id);
      updatedCount++;
    }
  }

  return { updatedCount };
}
