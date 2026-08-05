"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { initiateCollect, checkCollectStatus } from "@/lib/payments/campay";

// Parent requests to pay their child's fee balance via MoMo/Orange Money.
// This ONLY creates a pending request — total_fee_due is untouched until
// the payment is confirmed server-side (see confirmCampayPayment / webhook).
export async function payFeesOnline(studentId: string, amountXaf: number) {
  const cookieStore = await cookies();
  const session = cookieStore.get("parent_session");
  if (!session) return { error: "Session expired. Please log in again." };

  const { phone, accessCode } = JSON.parse(session.value);

  const supabase = await createClient();

  // Re-verify the parent owns this student server-side (never trust the client's studentId alone)
  const { data: parent } = await supabase
    .from("parents")
    .select("id, phone_primary")
    .eq("phone_primary", phone)
    .eq("access_code", accessCode)
    .single();
  if (!parent) return { error: "Session expired. Please log in again." };

  const { data: student } = await supabase
    .from("students")
    .select("id, total_fee_due, parent_id")
    .eq("id", studentId)
    .single();

  if (!student || student.parent_id !== parent.id) {
    return { error: "Student not found" };
  }
  if (!Number.isInteger(amountXaf) || amountXaf <= 0) {
    return { error: "Invalid amount" };
  }
  if (amountXaf > Number(student.total_fee_due)) {
    return { error: "Amount exceeds the outstanding balance" };
  }

  const externalReference = `kpa-${studentId}-${Date.now()}`;

  const collect = await initiateCollect(
    phone,
    amountXaf,
    `KPA school fee payment`,
    externalReference
  );
  if (!collect.ok || !collect.reference) {
    return { error: collect.error ?? "Could not start payment" };
  }

  const { error: insertError } = await supabase.from("payments").insert({
    student_id: studentId,
    collected_by: null,
    amount: amountXaf,
    payment_type: "school_fee",
    method: "campay_online",
    campay_reference: collect.reference,
    campay_status: "pending",
    initiated_by: "parent_portal",
    notes: `Initiated from parent portal (${phone})`,
  });

  if (insertError) {
    console.error("payFeesOnline insert error:", insertError.message);
    return { error: "Could not record payment request" };
  }

  return { reference: collect.reference };
}

// Called by the parent-portal UI while polling, and by the webhook handler.
// Always re-checks with CamPay directly — never trusts a caller-supplied status.
export async function confirmCampayPayment(reference: string) {
  const supabase = await createClient();

  const { data: payment } = await supabase
    .from("payments")
    .select("id, student_id, amount, campay_status")
    .eq("campay_reference", reference)
    .single();

  if (!payment) return { status: "not_found" as const };
  if (payment.campay_status !== "pending") return { status: payment.campay_status };

  const result = await checkCollectStatus(reference);
  if (!result) return { status: "pending" as const };

  if (result.status === "SUCCESSFUL") {
    await supabase
      .from("payments")
      .update({ campay_status: "successful" })
      .eq("id", payment.id);

    const { data: student } = await supabase
      .from("students")
      .select("total_fee_due")
      .eq("id", payment.student_id)
      .single();

    const newBalance = Math.max(0, Number(student?.total_fee_due ?? 0) - Number(payment.amount));
    await supabase.from("students").update({ total_fee_due: newBalance }).eq("id", payment.student_id);

    await supabase.from("audit_log").insert({
      action: "payment_collected",
      entity: "payments",
      entity_id: payment.id,
      details: { amount: payment.amount, method: "campay_online", source: "parent_portal" },
    });

    return { status: "successful" as const };
  }

  if (result.status === "FAILED") {
    await supabase.from("payments").update({ campay_status: "failed" }).eq("id", payment.id);
    return { status: "failed" as const };
  }

  return { status: "pending" as const };
}
