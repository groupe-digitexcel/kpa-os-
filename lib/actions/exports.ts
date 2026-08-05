"use server";

import { createClient } from "@/lib/supabase/server";
import { getLocalDb } from "@/lib/db/local";
import { isLocalMode } from "@/lib/data/mode";

function toCsv(rows: Record<string, any>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    if (v === null || v === undefined) return "";
    let s = String(v);
    // Prevent CSV/formula injection: Excel/Sheets treat a leading
    // = + - @ as the start of a formula, which is dangerous for
    // fields sourced from user input (names, notes, etc.).
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    s = s.replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  const lines = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))];
  return lines.join("\n");
}

export async function exportStudentsCsv() {
  let rows: Record<string, any>[];

  if (isLocalMode()) {
    const db = getLocalDb();
    rows = db
      .prepare(
        `SELECT s.full_name as "Student Name", c.name as "Class", s.age as "Age", s.sex as "Sex",
                p.full_name as "Parent Name", p.phone_primary as "Parent Phone",
                s.total_fee_due as "Fee Balance (XAF)", s.status as "Status"
         FROM students s
         LEFT JOIN classes c ON c.id = s.class_id
         LEFT JOIN parents p ON p.id = s.parent_id
         WHERE s.deleted = 0
         ORDER BY c.name, s.full_name`
      )
      .all() as any[];
  } else {
    const supabase = await createClient();
    const { data } = await supabase
      .from("students")
      .select("full_name, age, sex, total_fee_due, status, class:classes(name), parent:parents(full_name, phone_primary)")
      .order("full_name");
    rows = (data ?? []).map((s: any) => ({
      "Student Name": s.full_name,
      Class: s.class?.name ?? "",
      Age: s.age,
      Sex: s.sex,
      "Parent Name": s.parent?.full_name ?? "",
      "Parent Phone": s.parent?.phone_primary ?? "",
      "Fee Balance (XAF)": s.total_fee_due,
      Status: s.status,
    }));
  }

  return toCsv(rows);
}

export async function exportPaymentsCsv(startDate?: string, endDate?: string) {
  let rows: Record<string, any>[];

  if (isLocalMode()) {
    const db = getLocalDb();
    let query = `SELECT p.receipt_number as "Receipt", s.full_name as "Student", p.payment_type as "Type",
                        p.method as "Method", p.amount as "Amount (XAF)", p.paid_at as "Date", st.full_name as "Collected By"
                 FROM payments p
                 LEFT JOIN students s ON s.id = p.student_id
                 LEFT JOIN staff st ON st.id = p.collected_by
                 WHERE p.deleted = 0`;
    const params: any[] = [];
    if (startDate) { query += ` AND date(p.paid_at) >= ?`; params.push(startDate); }
    if (endDate) { query += ` AND date(p.paid_at) <= ?`; params.push(endDate); }
    query += ` ORDER BY p.paid_at DESC`;
    rows = db.prepare(query).all(...params) as any[];
  } else {
    const supabase = await createClient();
    let q = supabase
      .from("payments")
      .select("receipt_number, payment_type, method, amount, paid_at, student:students(full_name), staff:collected_by(full_name)")
      .order("paid_at", { ascending: false });
    if (startDate) q = q.gte("paid_at", `${startDate}T00:00:00`);
    if (endDate) q = q.lte("paid_at", `${endDate}T23:59:59`);
    const { data } = await q;
    rows = (data ?? []).map((p: any) => ({
      Receipt: p.receipt_number,
      Student: p.student?.full_name ?? "",
      Type: p.payment_type,
      Method: p.method,
      "Amount (XAF)": p.amount,
      Date: p.paid_at,
      "Collected By": p.staff?.full_name ?? "",
    }));
  }

  return toCsv(rows);
}

export async function exportAuditLogCsv() {
  let rows: Record<string, any>[];

  if (isLocalMode()) {
    const db = getLocalDb();
    rows = db
      .prepare(
        `SELECT al.created_at as "Date", st.full_name as "Staff", al.action as "Action", al.entity as "Entity", al.details as "Details"
         FROM audit_log al LEFT JOIN staff st ON st.id = al.actor_id
         ORDER BY al.created_at DESC LIMIT 1000`
      )
      .all() as any[];
  } else {
    const supabase = await createClient();
    const { data } = await supabase
      .from("audit_log")
      .select("created_at, action, entity, details, staff:actor_id(full_name)")
      .order("created_at", { ascending: false })
      .limit(1000);
    rows = (data ?? []).map((l: any) => ({
      Date: l.created_at,
      Staff: l.staff?.full_name ?? "System",
      Action: l.action,
      Entity: l.entity,
      Details: JSON.stringify(l.details),
    }));
  }

  return toCsv(rows);
}
