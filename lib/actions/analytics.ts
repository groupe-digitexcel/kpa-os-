"use server";

import { createClient } from "@/lib/supabase/server";
import { getLocalDb } from "@/lib/db/local";
import { isLocalMode } from "@/lib/data/mode";

function last30Days() {
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export async function getPaymentTrend() {
  const days = last30Days();

  if (isLocalMode()) {
    const db = getLocalDb();
    return days.map((date) => {
      const row = db
        .prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE date(paid_at) = ? AND deleted = 0`)
        .get(date) as { total: number };
      return { date, total: row.total };
    });
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("payments")
    .select("amount, paid_at")
    .gte("paid_at", `${days[0]}T00:00:00`);

  return days.map((date) => {
    const total = (data ?? [])
      .filter((p: any) => p.paid_at.startsWith(date))
      .reduce((sum: number, p: any) => sum + Number(p.amount), 0);
    return { date, total };
  });
}

export async function getAttendanceTrend() {
  const days = last30Days();

  if (isLocalMode()) {
    const db = getLocalDb();
    return days.map((date) => {
      const row = db
        .prepare(
          `SELECT
             COUNT(*) as total,
             SUM(CASE WHEN present = 1 THEN 1 ELSE 0 END) as present
           FROM daily_attendance WHERE attendance_date = ? AND deleted = 0`
        )
        .get(date) as { total: number; present: number };
      const pct = row.total > 0 ? Math.round((row.present / row.total) * 100) : null;
      return { date, pct };
    });
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("daily_attendance")
    .select("attendance_date, present")
    .gte("attendance_date", days[0]);

  return days.map((date) => {
    const dayRecords = (data ?? []).filter((a: any) => a.attendance_date === date);
    const pct = dayRecords.length > 0 ? Math.round((dayRecords.filter((a: any) => a.present).length / dayRecords.length) * 100) : null;
    return { date, pct };
  });
}

export async function getEnrollmentByClass() {
  if (isLocalMode()) {
    const db = getLocalDb();
    return db
      .prepare(
        `SELECT c.name, COUNT(s.id) as count
         FROM classes c LEFT JOIN students s ON s.class_id = c.id AND s.status = 'active' AND s.deleted = 0
         WHERE c.deleted = 0
         GROUP BY c.id ORDER BY c.name`
      )
      .all();
  }

  const supabase = await createClient();
  const { data: classes } = await supabase.from("classes").select("id, name");
  const { data: students } = await supabase.from("students").select("class_id").eq("status", "active");

  return (classes ?? []).map((c: any) => ({
    name: c.name,
    count: (students ?? []).filter((s: any) => s.class_id === c.id).length,
  }));
}
