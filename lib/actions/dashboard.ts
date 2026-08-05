"use server";

import { createClient } from "@/lib/supabase/server";
import { getLocalDb } from "@/lib/db/local";
import { isLocalMode } from "@/lib/data/mode";

export async function getDirectorOverviewStats() {
  if (isLocalMode()) {
    const db = getLocalDb();
    const total = db
      .prepare(`SELECT COUNT(*) as c FROM students WHERE status = 'active' AND deleted = 0`)
      .get() as { c: number };
    const unpaid = db
      .prepare(`SELECT COUNT(*) as c FROM students WHERE status = 'active' AND deleted = 0 AND total_fee_due > 0`)
      .get() as { c: number };
    return { totalStudents: total.c, unpaidCount: unpaid.c };
  }

  const supabase = await createClient();
  const [{ count: totalStudents }, { count: unpaidCount }] = await Promise.all([
    supabase.from("students").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("students").select("*", { count: "exact", head: true }).eq("status", "active").gt("total_fee_due", 0),
  ]);
  return { totalStudents: totalStudents ?? 0, unpaidCount: unpaidCount ?? 0 };
}

export async function getPendingReconciliations() {
  if (isLocalMode()) {
    const db = getLocalDb();
    const rows = db
      .prepare(
        `SELECT dr.*, st.full_name as staff_name
         FROM daily_reconciliation dr LEFT JOIN staff st ON st.id = dr.submitted_by
         WHERE dr.status = 'submitted' AND dr.deleted = 0
         ORDER BY dr.reconciliation_date DESC`
      )
      .all() as any[];
    return rows.map((r) => ({ ...r, staff: { full_name: r.staff_name } }));
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("daily_reconciliation")
    .select("*, staff:submitted_by(full_name)")
    .eq("status", "submitted")
    .order("reconciliation_date", { ascending: false });
  return data ?? [];
}

export async function getSecretaryTodayStats() {
  const today = new Date().toISOString().slice(0, 10);

  if (isLocalMode()) {
    const db = getLocalDb();
    const payments = db
      .prepare(`SELECT COUNT(*) as c FROM payments WHERE deleted = 0 AND date(paid_at) = ?`)
      .get(today) as { c: number };
    const recon = db
      .prepare(`SELECT status FROM daily_reconciliation WHERE reconciliation_date = ? AND deleted = 0`)
      .get(today) as { status: string } | undefined;
    return { todaysPayments: payments.c, todaysReconStatus: recon?.status ?? null };
  }

  const supabase = await createClient();
  const [{ count: todaysPayments }, { data: recon }] = await Promise.all([
    supabase.from("payments").select("*", { count: "exact", head: true }).gte("paid_at", `${today}T00:00:00`),
    supabase.from("daily_reconciliation").select("status").eq("reconciliation_date", today).maybeSingle(),
  ]);
  return { todaysPayments: todaysPayments ?? 0, todaysReconStatus: recon?.status ?? null };
}

export async function getTeacherClassRoster(staffId: string) {
  if (isLocalMode()) {
    const db = getLocalDb();
    const cls = db.prepare(`SELECT id, name FROM classes WHERE teacher_id = ? AND deleted = 0`).get(staffId) as
      | { id: string; name: string }
      | undefined;
    if (!cls) return { myClass: null, students: [] };

    const students = db
      .prepare(
        `SELECT id, full_name, age, sex FROM students WHERE class_id = ? AND status = 'active' AND deleted = 0 ORDER BY full_name`
      )
      .all(cls.id);
    return { myClass: cls, students };
  }

  const supabase = await createClient();
  const { data: myClass } = await supabase
    .from("classes")
    .select("*, students(id, full_name, age, sex, status)")
    .eq("teacher_id", staffId)
    .maybeSingle();

  const students = myClass?.students?.filter((s: any) => s.status === "active") ?? [];
  return { myClass, students };
}

export async function getFeeRegularizationByClass() {
  if (isLocalMode()) {
    const db = getLocalDb();
    const classes = db.prepare(`SELECT id, name FROM classes WHERE deleted = 0 ORDER BY name`).all() as {
      id: string;
      name: string;
    }[];

    return classes.map((c) => {
      const students = db
        .prepare(`SELECT total_fee_due FROM students WHERE class_id = ? AND status = 'active' AND deleted = 0`)
        .all(c.id) as { total_fee_due: number }[];
      const owing = students.filter((s) => s.total_fee_due > 0);
      const paidPct = students.length > 0 ? Math.round(((students.length - owing.length) / students.length) * 100) : 0;
      const totalOwed = owing.reduce((sum, s) => sum + Number(s.total_fee_due), 0);
      return { id: c.id, name: c.name, total: students.length, owingCount: owing.length, paidPct, totalOwed };
    });
  }

  const supabase = await createClient();
  const { data: classes } = await supabase.from("classes").select("id, name, students(id, total_fee_due, status)").order("name");

  return (classes ?? []).map((c: any) => {
    const active = c.students.filter((s: any) => s.status === "active");
    const owing = active.filter((s: any) => s.total_fee_due > 0);
    const paidPct = active.length > 0 ? Math.round(((active.length - owing.length) / active.length) * 100) : 0;
    const totalOwed = owing.reduce((sum: number, s: any) => sum + Number(s.total_fee_due), 0);
    return { id: c.id, name: c.name, total: active.length, owingCount: owing.length, paidPct, totalOwed };
  });
}

export async function getAuditLog(limit = 100) {
  if (isLocalMode()) {
    const db = getLocalDb();
    const rows = db
      .prepare(
        `SELECT al.*, st.full_name as staff_name
         FROM audit_log al LEFT JOIN staff st ON st.id = al.actor_id
         ORDER BY al.created_at DESC LIMIT ?`
      )
      .all(limit) as any[];
    return rows.map((r) => ({ ...r, staff: { full_name: r.staff_name } }));
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_log")
    .select("*, staff:actor_id(full_name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}
