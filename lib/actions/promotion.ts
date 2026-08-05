"use server";

import { createClient } from "@/lib/supabase/server";
import { getLocalDb, newId, nowIso, writeWithSync } from "@/lib/db/local";
import { getEffectiveStaff } from "@/lib/data/currentStaff";
import { isLocalMode } from "@/lib/data/mode";
import { revalidatePath } from "next/cache";

export async function getClassRosterForPromotion(classId: string) {
  if (isLocalMode()) {
    const db = getLocalDb();
    return db
      .prepare(`SELECT id, full_name, total_fee_due FROM students WHERE class_id = ? AND status = 'active' AND deleted = 0 ORDER BY full_name`)
      .all(classId);
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("students")
    .select("id, full_name, total_fee_due")
    .eq("class_id", classId)
    .eq("status", "active")
    .order("full_name");
  return data ?? [];
}

export type PromotionInput = {
  studentIds: string[];
  action: "promote" | "graduate" | "drop_out";
  destinationClassId?: string; // required if action === "promote"
};

export async function promoteStudents(input: PromotionInput) {
  const staff = await getEffectiveStaff();
  if (!staff || staff.role !== "director") return { error: "Only the Director can promote students." };

  if (input.action === "promote" && !input.destinationClassId) {
    return { error: "Choose a destination class." };
  }

  const now = nowIso();
  let updatedCount = 0;

  if (isLocalMode()) {
    const db = getLocalDb();

    for (const studentId of input.studentIds) {
      let updates: Record<string, any> = { id: studentId, updated_at: now };
      let sql = "";

      if (input.action === "promote") {
        updates.class_id = input.destinationClassId;
        sql = `UPDATE students SET class_id = ?, updated_at = ? WHERE id = ?`;
      } else if (input.action === "graduate") {
        updates.status = "graduated";
        sql = `UPDATE students SET status = 'graduated', updated_at = ? WHERE id = ?`;
      } else {
        updates.status = "dropped_out";
        sql = `UPDATE students SET status = 'dropped_out', updated_at = ? WHERE id = ?`;
      }

      writeWithSync("students", studentId, "update", updates, (db) => {
        if (input.action === "promote") {
          db.prepare(sql).run(input.destinationClassId, now, studentId);
        } else {
          db.prepare(sql).run(now, studentId);
        }
      });

      updatedCount++;
    }

    const auditId = newId();
    writeWithSync(
      "audit_log",
      auditId,
      "insert",
      { id: auditId, actor_id: staff.id, action: `students_${input.action}d`, entity: "students", details: JSON.stringify({ count: updatedCount, destinationClassId: input.destinationClassId }), created_at: now },
      (db) => {
        db.prepare(
          `INSERT INTO audit_log (id, actor_id, action, entity, details, created_at) VALUES (?, ?, ?, 'students', ?, ?)`
        ).run(auditId, staff.id, `students_${input.action}d`, JSON.stringify({ count: updatedCount, destinationClassId: input.destinationClassId }), now);
      }
    );

    revalidatePath("/dashboard/director/promotion");
    return { updatedCount };
  }

  const supabase = await createClient();
  for (const studentId of input.studentIds) {
    const update =
      input.action === "promote"
        ? { class_id: input.destinationClassId }
        : input.action === "graduate"
        ? { status: "graduated" }
        : { status: "dropped_out" };

    const { error } = await supabase.from("students").update(update).eq("id", studentId);
    if (!error) updatedCount++;
  }

  await supabase.from("audit_log").insert({
    actor_id: staff.id,
    action: `students_${input.action}d`,
    entity: "students",
    details: { count: updatedCount, destinationClassId: input.destinationClassId },
  });

  revalidatePath("/dashboard/director/promotion");
  return { updatedCount };
}
