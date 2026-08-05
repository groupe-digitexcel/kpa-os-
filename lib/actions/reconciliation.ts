"use server";

import { createClient } from "@/lib/supabase/server";
import { getLocalDb, newId, nowIso, writeWithSync } from "@/lib/db/local";
import { getEffectiveStaff } from "@/lib/data/currentStaff";
import { isLocalMode } from "@/lib/data/mode";
import { revalidatePath } from "next/cache";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export async function getTodaysExpectedTotals() {
  const today = todayISO();

  if (isLocalMode()) {
    const db = getLocalDb();
    const rows = db
      .prepare(
        `SELECT amount, method FROM payments
         WHERE deleted = 0 AND date(paid_at) = ?`
      )
      .all(today) as { amount: number; method: string }[];

    const totals = { cash: 0, momo: 0, other: 0 };
    for (const p of rows) {
      if (p.method === "cash") totals.cash += Number(p.amount);
      else if (p.method === "momo" || p.method === "orange_money") totals.momo += Number(p.amount);
      else totals.other += Number(p.amount);
    }
    return totals;
  }

  const supabase = await createClient();
  const { data: payments } = await supabase
    .from("payments")
    .select("amount, method")
    .gte("paid_at", `${today}T00:00:00`)
    .lte("paid_at", `${today}T23:59:59`);

  const totals = { cash: 0, momo: 0, other: 0 };
  for (const p of payments ?? []) {
    if (p.method === "cash") totals.cash += Number(p.amount);
    else if (p.method === "momo" || p.method === "orange_money") totals.momo += Number(p.amount);
    else totals.other += Number(p.amount);
  }
  return totals;
}

export async function getTodaysReconciliation() {
  if (isLocalMode()) {
    const db = getLocalDb();
    return db
      .prepare(`SELECT * FROM daily_reconciliation WHERE reconciliation_date = ? AND deleted = 0`)
      .get(todayISO());
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("daily_reconciliation")
    .select("*")
    .eq("reconciliation_date", todayISO())
    .maybeSingle();
  return data;
}

export async function submitReconciliation(input: {
  declaredCash: number;
  declaredMomo: number;
  notes?: string;
}) {
  const staff = await getEffectiveStaff();
  if (!staff) return { error: "Not authenticated" };

  const expected = await getTodaysExpectedTotals();
  const variance = input.declaredCash - expected.cash + (input.declaredMomo - expected.momo);
  const today = todayISO();
  const now = nowIso();

  if (isLocalMode()) {
    const db = getLocalDb();

    const existing = db
      .prepare(`SELECT id FROM daily_reconciliation WHERE reconciliation_date = ? AND submitted_by = ?`)
      .get(today, staff.id) as { id: string } | undefined;

    const id = existing?.id ?? newId();

    const row = {
      id,
      reconciliation_date: today,
      submitted_by: staff.id,
      approved_by: null,
      expected_cash: expected.cash,
      expected_momo: expected.momo,
      declared_cash: input.declaredCash,
      declared_momo: input.declaredMomo,
      variance_cash: input.declaredCash - expected.cash,
      variance_momo: input.declaredMomo - expected.momo,
      status: "submitted",
      handed_to_accountant_at: now,
      notes: input.notes ?? null,
      created_at: now,
      updated_at: now,
    };

    writeWithSync("daily_reconciliation", id, existing ? "update" : "insert", row, (db) => {
      db.prepare(
        `INSERT INTO daily_reconciliation
           (id, reconciliation_date, submitted_by, approved_by, expected_cash, expected_momo,
            declared_cash, declared_momo, variance_cash, variance_momo, status,
            handed_to_accountant_at, notes, created_at, updated_at)
         VALUES
           (@id, @reconciliation_date, @submitted_by, @approved_by, @expected_cash, @expected_momo,
            @declared_cash, @declared_momo, @variance_cash, @variance_momo, @status,
            @handed_to_accountant_at, @notes, @created_at, @updated_at)
         ON CONFLICT(id) DO UPDATE SET
           expected_cash = excluded.expected_cash,
           expected_momo = excluded.expected_momo,
           declared_cash = excluded.declared_cash,
           declared_momo = excluded.declared_momo,
           variance_cash = excluded.variance_cash,
           variance_momo = excluded.variance_momo,
           status = excluded.status,
           handed_to_accountant_at = excluded.handed_to_accountant_at,
           notes = excluded.notes,
           updated_at = excluded.updated_at`
      ).run(row);
    });

    const auditId = newId();
    writeWithSync(
      "audit_log",
      auditId,
      "insert",
      {
        id: auditId,
        actor_id: staff.id,
        action: "reconciliation_submitted",
        entity: "daily_reconciliation",
        entity_id: id,
        details: JSON.stringify({ variance, expected, declared: input }),
        created_at: now,
      },
      (db) => {
        db.prepare(
          `INSERT INTO audit_log (id, actor_id, action, entity, entity_id, details, created_at)
           VALUES (?, ?, 'reconciliation_submitted', 'daily_reconciliation', ?, ?, ?)`
        ).run(auditId, staff.id, id, JSON.stringify({ variance, expected, declared: input }), now);
      }
    );

    revalidatePath("/dashboard/secretary");
    revalidatePath("/dashboard/secretary/reconciliation");
    revalidatePath("/dashboard/accountant");

    return { data: row };
  }

  // ---- Cloud mode ----
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("daily_reconciliation")
    .upsert(
      {
        reconciliation_date: today,
        submitted_by: staff.id,
        expected_cash: expected.cash,
        expected_momo: expected.momo,
        declared_cash: input.declaredCash,
        declared_momo: input.declaredMomo,
        status: "submitted",
        notes: input.notes ?? null,
        handed_to_accountant_at: now,
      },
      { onConflict: "reconciliation_date,submitted_by" }
    )
    .select()
    .single();

  if (error) {
    console.error("submitReconciliation error:", error.message);
    return { error: "Could not submit reconciliation." };
  }

  await supabase.from("audit_log").insert({
    actor_id: staff.id,
    action: "reconciliation_submitted",
    entity: "daily_reconciliation",
    entity_id: data.id,
    details: { variance, expected, declared: input },
  });

  revalidatePath("/dashboard/secretary");
  revalidatePath("/dashboard/secretary/reconciliation");
  revalidatePath("/dashboard/accountant");

  return { data };
}

export async function approveReconciliation(reconciliationId: string, approve: boolean) {
  const staff = await getEffectiveStaff();
  if (!staff || (staff.role !== "accountant" && staff.role !== "director")) {
    return { error: "Not authorized" };
  }

  if (isLocalMode()) {
    const db = getLocalDb();
    const now = nowIso();
    const status = approve ? "approved" : "flagged";

    writeWithSync(
      "daily_reconciliation",
      reconciliationId,
      "update",
      { id: reconciliationId, status, approved_by: staff.id, updated_at: now },
      (db) => {
        db.prepare(
          `UPDATE daily_reconciliation SET status = ?, approved_by = ?, updated_at = ? WHERE id = ?`
        ).run(status, staff.id, now, reconciliationId);
      }
    );

    const auditId = newId();
    writeWithSync(
      "audit_log",
      auditId,
      "insert",
      {
        id: auditId,
        actor_id: staff.id,
        action: approve ? "reconciliation_approved" : "reconciliation_flagged",
        entity: "daily_reconciliation",
        entity_id: reconciliationId,
        created_at: now,
      },
      (db) => {
        db.prepare(
          `INSERT INTO audit_log (id, actor_id, action, entity, entity_id, created_at)
           VALUES (?, ?, ?, 'daily_reconciliation', ?, ?)`
        ).run(auditId, staff.id, approve ? "reconciliation_approved" : "reconciliation_flagged", reconciliationId, now);
      }
    );

    revalidatePath("/dashboard/accountant");
    return { data: { id: reconciliationId, status } };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("daily_reconciliation")
    .update({ status: approve ? "approved" : "flagged", approved_by: staff.id })
    .eq("id", reconciliationId)
    .select()
    .single();

  if (error) return { error: "Could not update reconciliation." };

  await supabase.from("audit_log").insert({
    actor_id: staff.id,
    action: approve ? "reconciliation_approved" : "reconciliation_flagged",
    entity: "daily_reconciliation",
    entity_id: reconciliationId,
  });

  revalidatePath("/dashboard/accountant");
  return { data };
}
