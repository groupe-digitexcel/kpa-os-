"use server";

import { createClient } from "@/lib/supabase/server";
import { getLocalDb, newId, writeWithSync } from "@/lib/db/local";
import { isLocalMode } from "@/lib/data/mode";
import { cookies } from "next/headers";

function generateCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// Called by the Secretary to issue (or reset) a parent's portal access code.
export async function generateParentAccessCode(parentId: string) {
  const code = generateCode();

  if (isLocalMode()) {
    const db = getLocalDb();
    writeWithSync("parents", parentId, "update", { id: parentId, access_code: code }, (db) => {
      db.prepare(`UPDATE parents SET access_code = ? WHERE id = ?`).run(code, parentId);
    });
    return { code };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("parents").update({ access_code: code }).eq("id", parentId);
  if (error) return { error: "Could not generate access code." };
  return { code };
}

async function fetchParentDataLocal(phone: string, accessCode: string) {
  const db = getLocalDb();
  const parent = db
    .prepare(`SELECT id, full_name FROM parents WHERE phone_primary = ? AND access_code = ? AND deleted = 0`)
    .get(phone, accessCode) as { id: string; full_name: string } | undefined;

  if (!parent) return { error: "not_found" };

  const students = db
    .prepare(`SELECT id, full_name, total_fee_due, class_id FROM students WHERE parent_id = ? AND status = 'active' AND deleted = 0`)
    .all(parent.id) as any[];

  const children = students.map((s) => {
    const cls = s.class_id ? db.prepare(`SELECT name FROM classes WHERE id = ?`).get(s.class_id) as any : null;
    const payments = db
      .prepare(`SELECT amount, paid_at, payment_type, receipt_number FROM payments WHERE student_id = ? ORDER BY paid_at DESC LIMIT 10`)
      .all(s.id);
    const attendance = db
      .prepare(`SELECT attendance_date as date, present FROM daily_attendance WHERE student_id = ? ORDER BY attendance_date DESC LIMIT 30`)
      .all(s.id);
    const reportCards = db
      .prepare(`SELECT term, ai_generated_comment as comment, created_at FROM documents_generated WHERE student_id = ? AND doc_type = 'report_card'`)
      .all(s.id);
    const grades = db
      .prepare(
        `SELECT sub.name as subject, a.title, a.term, g.score, a.max_score
         FROM grades g JOIN assessments a ON a.id = g.assessment_id JOIN subjects sub ON sub.id = a.subject_id
         WHERE g.student_id = ?`
      )
      .all(s.id);

    return {
      id: s.id,
      full_name: s.full_name,
      class_name: cls?.name ?? null,
      total_fee_due: s.total_fee_due,
      recent_payments: payments,
      attendance_last_30_days: attendance,
      report_cards: reportCards,
      grades,
    };
  });

  return { parent: { full_name: parent.full_name }, children };
}

export async function parentLogin(phone: string, accessCode: string) {
  let result: any;

  if (isLocalMode()) {
    result = await fetchParentDataLocal(phone, accessCode.toUpperCase());
  } else {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_parent_portal_data", {
      p_access_code: accessCode.toUpperCase(),
      p_phone: phone,
    });
    if (error || data?.error) return { error: "Invalid phone number or access code." };
    result = data;
  }

  if (result.error) return { error: "Invalid phone number or access code." };

  const cookieStore = await cookies();
  cookieStore.set("parent_session", JSON.stringify({ phone, accessCode: accessCode.toUpperCase() }), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });

  return { data: result };
}

export async function getParentSessionData() {
  const cookieStore = await cookies();
  const session = cookieStore.get("parent_session");
  if (!session) return null;

  try {
    const { phone, accessCode } = JSON.parse(session.value);

    if (isLocalMode()) {
      const result = await fetchParentDataLocal(phone, accessCode);
      return result.error ? null : result;
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_parent_portal_data", {
      p_access_code: accessCode,
      p_phone: phone,
    });
    if (error || data?.error) return null;
    return data;
  } catch {
    return null;
  }
}

export async function parentLogout() {
  const cookieStore = await cookies();
  cookieStore.delete("parent_session");
}
