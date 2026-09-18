"use server";

import { createClient } from "@/lib/supabase/server";

const ALLOWED_ROLES = new Set(["director", "secretary", "teacher"]);
const TYPES = new Set(["fee_reminder", "event_notice", "appreciation", "report_card_ready", "general"]);

export async function queueParentMessage(input: {
  parentId?: string;
  studentId?: string;
  phone: string;
  messageBody: string;
  messageType: "fee_reminder" | "event_notice" | "appreciation" | "report_card_ready" | "general";
  language?: "fr" | "en";
}) {
  if (!input.phone.trim() || !input.messageBody.trim() || input.messageBody.length > 1000 || !TYPES.has(input.messageType)) {
    return { error: "Invalid communication payload." };
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Unauthorized" };

  const { data: staff } = await supabase
    .from("staff")
    .select("id, role")
    .eq("auth_user_id", auth.user.id)
    .eq("active", true)
    .maybeSingle();

  if (!staff || !ALLOWED_ROLES.has(staff.role)) return { error: "Forbidden" };

  const { data, error } = await supabase
    .from("sms_log")
    .insert({
      parent_id: input.parentId || null,
      student_id: input.studentId || null,
      phone: input.phone.trim(),
      message_type: input.messageType,
      message_body: input.messageBody.trim(),
      language: input.language || "fr",
      status: "pending",
    })
    .select("id, status, created_at")
    .single();

  if (error) return { error: "Could not queue message." };

  await supabase.from("audit_log").insert({
    actor_id: staff.id,
    action: "communication_queued",
    entity: "sms_log",
    entity_id: data.id,
    details: { message_type: input.messageType, language: input.language || "fr" },
  });

  return { data };
}
