"use server";

import { createClient } from "@/lib/supabase/server";
import { getLocalDb, newId, nowIso, writeWithSync } from "@/lib/db/local";
import { getEffectiveStaff } from "@/lib/data/currentStaff";
import { isLocalMode } from "@/lib/data/mode";
import { sendSms } from "@/lib/sms/gateway";
import { generateSmsCopy } from "@/lib/ai/openrouter";
import { revalidatePath } from "next/cache";

export type Audience =
  | { type: "all" }
  | { type: "class"; classId: string }
  | { type: "fee_owing" }
  | { type: "individual"; studentId: string };

async function resolveAudienceLocal(audience: Audience) {
  const db = getLocalDb();
  let where = "s.status = 'active' AND s.deleted = 0";
  const params: any = {};

  if (audience.type === "class") {
    where += " AND s.class_id = @classId";
    params.classId = audience.classId;
  }
  if (audience.type === "fee_owing") where += " AND s.total_fee_due > 0";
  if (audience.type === "individual") {
    where += " AND s.id = @studentId";
    params.studentId = audience.studentId;
  }

  const rows = db
    .prepare(
      `SELECT s.id, s.full_name, p.id as parent_id, p.full_name as parent_name, p.phone_primary
       FROM students s LEFT JOIN parents p ON p.id = s.parent_id
       WHERE ${where}`
    )
    .all(params) as any[];

  return rows.filter((r) => r.phone_primary);
}

async function resolveAudienceCloud(audience: Audience) {
  const supabase = await createClient();
  let query = supabase
    .from("students")
    .select("id, full_name, parent:parents(id, full_name, phone_primary)")
    .eq("status", "active");

  if (audience.type === "class") query = query.eq("class_id", audience.classId);
  if (audience.type === "fee_owing") query = query.gt("total_fee_due", 0);
  if (audience.type === "individual") query = query.eq("id", audience.studentId);

  const { data } = await query;
  return (data ?? []).filter((s: any) => s.parent?.phone_primary);
}

export async function draftSmsMessage(input: {
  purpose: "fee_reminder" | "event_notice" | "appreciation";
  context: string;
  language: "fr" | "en";
}) {
  const message = await generateSmsCopy(input);
  if (!message)
    return { error: "Could not draft the message right now (needs internet). Please write it manually." };
  return { message };
}

export async function sendBulkSms(input: {
  audience: Audience;
  message: string;
  messageType: "fee_reminder" | "event_notice" | "appreciation" | "report_card_ready" | "general";
  language: "fr" | "en";
}) {
  const staff = await getEffectiveStaff();
  if (!staff) return { error: "Not authenticated" };
  if (!input.message.trim()) return { error: "Message cannot be empty." };

  if (isLocalMode()) {
    const db = getLocalDb();
    const students = await resolveAudienceLocal(input.audience);
    if (students.length === 0) return { error: "No parents with a phone number match this audience." };

    let sentCount = 0;
    let queuedCount = 0;
    const now = nowIso();

    for (const s of students) {
      const result = await sendSms(s.phone_primary, input.message);
      const id = newId();
      // If the gateway call genuinely failed (e.g. offline), queue as
      // "pending" so it can be retried automatically, rather than "failed".
      const status = result.ok ? "sent" : "pending";

      const row = {
        id,
        parent_id: s.parent_id,
        student_id: s.id,
        phone: s.phone_primary,
        message_type: input.messageType,
        message_body: input.message,
        language: input.language,
        status,
        sent_at: result.ok ? now : null,
        created_at: now,
        updated_at: now,
      };

      writeWithSync("sms_log", id, "insert", row, (db) => {
        db.prepare(
          `INSERT INTO sms_log (id, parent_id, student_id, phone, message_type, message_body, language, status, sent_at, created_at, updated_at)
           VALUES (@id, @parent_id, @student_id, @phone, @message_type, @message_body, @language, @status, @sent_at, @created_at, @updated_at)`
        ).run(row);
      });

      if (result.ok) sentCount++;
      else queuedCount++;
    }

    const auditId = newId();
    writeWithSync(
      "audit_log",
      auditId,
      "insert",
      { id: auditId, actor_id: staff.id, action: "sms_bulk_sent", entity: "sms_log", details: JSON.stringify({ audience: input.audience, recipientCount: students.length, messageType: input.messageType }), created_at: now },
      (db) => {
        db.prepare(
          `INSERT INTO audit_log (id, actor_id, action, entity, details, created_at) VALUES (?, ?, 'sms_bulk_sent', 'sms_log', ?, ?)`
        ).run(auditId, staff.id, JSON.stringify({ audience: input.audience, recipientCount: students.length, messageType: input.messageType }), now);
      }
    );

    revalidatePath("/dashboard/secretary/documents");

    return {
      data: {
        recipientCount: students.length,
        sentCount,
        simulated: sentCount > 0 && !process.env.SMS_GATEWAY_API_KEY,
        queuedOffline: queuedCount > 0,
      },
    };
  }

  // ---- Cloud mode ----
  const supabase = await createClient();
  const students = await resolveAudienceCloud(input.audience);
  if (students.length === 0) return { error: "No parents with a phone number match this audience." };

  let sentCount = 0;
  let simulatedCount = 0;

  for (const s of students as any[]) {
    const result = await sendSms(s.parent.phone_primary, input.message);
    if (result.simulated) simulatedCount++;
    if (result.ok) sentCount++;

    await supabase.from("sms_log").insert({
      parent_id: s.parent.id,
      student_id: s.id,
      phone: s.parent.phone_primary,
      message_type: input.messageType,
      message_body: input.message,
      language: input.language,
      status: result.ok ? "sent" : "failed",
      sent_at: result.ok ? new Date().toISOString() : null,
    });
  }

  await supabase.from("audit_log").insert({
    actor_id: staff.id,
    action: "sms_bulk_sent",
    entity: "sms_log",
    details: { audience: input.audience, recipientCount: students.length, messageType: input.messageType },
  });

  revalidatePath("/dashboard/secretary/documents");

  return { data: { recipientCount: students.length, sentCount, simulated: simulatedCount > 0 } };
}

export async function getRecentSms(limit = 20) {
  if (isLocalMode()) {
    const db = getLocalDb();
    const rows = db
      .prepare(
        `SELECT sl.*, s.full_name as student_name
         FROM sms_log sl LEFT JOIN students s ON s.id = sl.student_id
         WHERE sl.deleted = 0 ORDER BY sl.created_at DESC LIMIT ?`
      )
      .all(limit) as any[];
    return rows.map((r) => ({ ...r, student: r.student_name ? { full_name: r.student_name } : null }));
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("sms_log")
    .select("*, student:students(full_name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

// Retries any SMS queued as "pending" (i.e. attempted while offline). Called
// by the sync cycle whenever the app detects it's back online.
export async function retryPendingSms() {
  if (!isLocalMode()) return { retried: 0 };

  const db = getLocalDb();
  const pending = db.prepare(`SELECT * FROM sms_log WHERE status = 'pending' AND deleted = 0`).all() as any[];

  let retried = 0;
  for (const row of pending) {
    const result = await sendSms(row.phone, row.message_body);
    if (result.ok) {
      const now = nowIso();
      writeWithSync("sms_log", row.id, "update", { id: row.id, status: "sent", sent_at: now, updated_at: now }, (db) => {
        db.prepare(`UPDATE sms_log SET status = 'sent', sent_at = ?, updated_at = ? WHERE id = ?`).run(now, now, row.id);
      });
      retried++;
    }
  }
  return { retried };
}
