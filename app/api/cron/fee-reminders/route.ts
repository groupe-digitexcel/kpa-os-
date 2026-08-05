import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendSms } from "@/lib/sms/gateway";

// Vercel Cron hits this on a schedule (see vercel.json). Protected by
// CRON_SECRET so it can't be triggered by anyone who finds the URL.
// This is cloud-only: local desktop installs don't run persistent cron jobs,
// only Vercel does, so this route is a no-op unless deployed there.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  const { data: students } = await supabase
    .from("students")
    .select("id, full_name, total_fee_due, parent:parents(id, full_name, phone_primary)")
    .eq("status", "active")
    .gt("total_fee_due", 0);

  const owing = (students ?? []).filter((s: any) => s.parent?.phone_primary);

  let sent = 0;
  for (const s of owing as any[]) {
    const messageFr = `Kingdom Passion Academy: Le solde des frais scolaires de ${s.full_name} est de ${Number(s.total_fee_due).toLocaleString()} XAF. Merci de regulariser des que possible.`;

    const result = await sendSms(s.parent.phone_primary, messageFr);

    await supabase.from("sms_log").insert({
      parent_id: s.parent.id,
      student_id: s.id,
      phone: s.parent.phone_primary,
      message_type: "fee_reminder",
      message_body: messageFr,
      language: "fr",
      status: result.ok ? "sent" : "failed",
      sent_at: result.ok ? new Date().toISOString() : null,
    });

    if (result.ok) sent++;
  }

  await supabase.from("audit_log").insert({
    action: "automated_fee_reminders_sent",
    entity: "sms_log",
    details: { totalOwing: owing.length, sent },
  });

  return NextResponse.json({ totalOwing: owing.length, sent });
}
