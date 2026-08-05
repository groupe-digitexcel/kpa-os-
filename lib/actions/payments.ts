"use server";

import { createClient } from "@/lib/supabase/server";
import { getLocalDb, newId, nowIso, writeWithSync } from "@/lib/db/local";
import { getEffectiveStaff } from "@/lib/data/currentStaff";
import { isLocalMode } from "@/lib/data/mode";
import { revalidatePath } from "next/cache";

export async function searchStudents(query: string) {
  if (!query || query.trim().length < 2) return [];

  if (isLocalMode()) {
    const db = getLocalDb();
    const rows = db
      .prepare(
        `SELECT s.id, s.full_name, s.age, s.sex, s.total_fee_due,
                c.name as class_name, p.full_name as parent_name, p.phone_primary
         FROM students s
         LEFT JOIN classes c ON c.id = s.class_id
         LEFT JOIN parents p ON p.id = s.parent_id
         WHERE s.status = 'active' AND s.deleted = 0 AND s.full_name LIKE ?
         LIMIT 10`
      )
      .all(`%${query}%`) as any[];

    return rows.map((r) => ({
      id: r.id,
      full_name: r.full_name,
      age: r.age,
      sex: r.sex,
      total_fee_due: r.total_fee_due,
      class: r.class_name ? { name: r.class_name } : null,
      parent: r.parent_name ? { full_name: r.parent_name, phone_primary: r.phone_primary } : null,
    }));
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select("id, full_name, age, sex, total_fee_due, class:classes(name), parent:parents(full_name, phone_primary)")
    .ilike("full_name", `%${query}%`)
    .eq("status", "active")
    .limit(10);

  if (error) {
    console.error("searchStudents error:", error.message);
    return [];
  }
  return data;
}

export type CreatePaymentInput = {
  studentId: string;
  amount: number;
  paymentType:
    | "school_fee"
    | "xmas_party"
    | "end_of_year_party"
    | "exam_fee"
    | "uniform"
    | "sportswear"
    | "other";
  method: "cash" | "momo" | "orange_money" | "campay_online" | "other";
  notes?: string;
};

function generateReceiptNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `RCPT-${date}-${rand}`;
}

export async function createPayment(input: CreatePaymentInput) {
  const staff = await getEffectiveStaff();
  if (!staff) return { error: "Not authenticated" };
  if (input.amount <= 0) return { error: "Amount must be greater than zero" };

  if (isLocalMode()) {
    const db = getLocalDb();
    const paymentId = newId();
    const receiptNumber = generateReceiptNumber();
    const paidAt = nowIso();

    const paymentRow = {
      id: paymentId,
      student_id: input.studentId,
      collected_by: staff.id,
      amount: input.amount,
      payment_type: input.paymentType,
      method: input.method,
      receipt_number: receiptNumber,
      notes: input.notes ?? null,
      paid_at: paidAt,
      created_at: paidAt,
      updated_at: paidAt,
    };

    writeWithSync("payments", paymentId, "insert", paymentRow, (db) => {
      db.prepare(
        `INSERT INTO payments (id, student_id, collected_by, amount, payment_type, method, receipt_number, notes, paid_at, created_at, updated_at)
         VALUES (@id, @student_id, @collected_by, @amount, @payment_type, @method, @receipt_number, @notes, @paid_at, @created_at, @updated_at)`
      ).run(paymentRow);

      if (input.paymentType === "school_fee") {
        const student = db.prepare(`SELECT total_fee_due FROM students WHERE id = ?`).get(input.studentId) as
          | { total_fee_due: number }
          | undefined;
        const newBalance = Math.max(0, (student?.total_fee_due ?? 0) - input.amount);
        db.prepare(`UPDATE students SET total_fee_due = ?, updated_at = ? WHERE id = ?`).run(
          newBalance,
          paidAt,
          input.studentId
        );
      }
    });

    if (input.paymentType === "school_fee") {
      const updatedStudent = db.prepare(`SELECT * FROM students WHERE id = ?`).get(input.studentId);
      writeWithSync("students", input.studentId, "update", updatedStudent as any, () => {});
    }

    const auditId = newId();
    writeWithSync(
      "audit_log",
      auditId,
      "insert",
      {
        id: auditId,
        actor_id: staff.id,
        action: "payment_collected",
        entity: "payments",
        entity_id: paymentId,
        details: JSON.stringify({ amount: input.amount, method: input.method, type: input.paymentType }),
        created_at: paidAt,
      },
      (db) => {
        db.prepare(
          `INSERT INTO audit_log (id, actor_id, action, entity, entity_id, details, created_at)
           VALUES (?, ?, 'payment_collected', 'payments', ?, ?, ?)`
        ).run(
          auditId,
          staff.id,
          paymentId,
          JSON.stringify({ amount: input.amount, method: input.method, type: input.paymentType }),
          paidAt
        );
      }
    );

    revalidatePath("/dashboard/secretary");
    revalidatePath("/dashboard/secretary/payments");

    return { data: paymentRow };
  }

  // ---- Cloud mode (unchanged behavior) ----
  const supabase = await createClient();

  const { data: payment, error } = await supabase
    .from("payments")
    .insert({
      student_id: input.studentId,
      collected_by: staff.id,
      amount: input.amount,
      payment_type: input.paymentType,
      method: input.method,
      notes: input.notes ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("createPayment error:", error.message);
    return { error: "Could not record payment. Please try again." };
  }

  if (input.paymentType === "school_fee") {
    const { data: student } = await supabase
      .from("students")
      .select("total_fee_due")
      .eq("id", input.studentId)
      .single();

    const newBalance = Math.max(0, (student?.total_fee_due ?? 0) - input.amount);

    await supabase.from("students").update({ total_fee_due: newBalance }).eq("id", input.studentId);
  }

  await supabase.from("audit_log").insert({
    actor_id: staff.id,
    action: "payment_collected",
    entity: "payments",
    entity_id: payment.id,
    details: { amount: input.amount, method: input.method, type: input.paymentType },
  });

  revalidatePath("/dashboard/secretary");
  revalidatePath("/dashboard/secretary/payments");

  return { data: payment };
}

export async function getRecentPayments(limit = 15) {
  if (isLocalMode()) {
    const db = getLocalDb();
    const rows = db
      .prepare(
        `SELECT p.*, s.full_name as student_name, st.full_name as staff_name
         FROM payments p
         LEFT JOIN students s ON s.id = p.student_id
         LEFT JOIN staff st ON st.id = p.collected_by
         WHERE p.deleted = 0
         ORDER BY p.paid_at DESC
         LIMIT ?`
      )
      .all(limit) as any[];

    return rows.map((r) => ({
      ...r,
      student: { full_name: r.student_name },
      staff: { full_name: r.staff_name },
    }));
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("payments")
    .select("*, student:students(full_name), staff:collected_by(full_name)")
    .order("paid_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getPaymentByReceipt(receiptNumber: string) {
  if (isLocalMode()) {
    const db = getLocalDb();
    const row = db
      .prepare(
        `SELECT p.*, s.full_name as student_name, c.name as class_name, st.full_name as staff_name
         FROM payments p
         LEFT JOIN students s ON s.id = p.student_id
         LEFT JOIN classes c ON c.id = s.class_id
         LEFT JOIN staff st ON st.id = p.collected_by
         WHERE p.receipt_number = ?`
      )
      .get(receiptNumber) as any;

    if (!row) return null;
    return {
      ...row,
      student: { full_name: row.student_name, class: { name: row.class_name } },
      staff: { full_name: row.staff_name },
    };
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("payments")
    .select("*, student:students(full_name, class:classes(name)), staff:collected_by(full_name)")
    .eq("receipt_number", receiptNumber)
    .single();
  return data;
}
