"use server";

import { createClient } from "@/lib/supabase/server";
import { getLocalDb, newId, nowIso, writeWithSync } from "@/lib/db/local";
import { getEffectiveStaff } from "@/lib/data/currentStaff";
import { isLocalMode } from "@/lib/data/mode";
import { revalidatePath } from "next/cache";

export type ExpenseCategory = "salaries" | "utilities" | "supplies" | "maintenance" | "food" | "transport" | "marketing" | "other";

export type CreateExpenseInput = {
  category: ExpenseCategory;
  description: string;
  amount: number;
  receiptNote?: string;
};

export async function createExpense(input: CreateExpenseInput) {
  const staff = await getEffectiveStaff();
  if (!staff || (staff.role !== "director" && staff.role !== "accountant")) {
    return { error: "Only the Director or Accountant can record expenses." };
  }
  if (input.amount <= 0) return { error: "Amount must be greater than zero." };

  if (isLocalMode()) {
    const db = getLocalDb();
    const id = newId();
    const now = nowIso();
    const row = {
      id,
      category: input.category,
      description: input.description,
      amount: input.amount,
      expense_date: now.slice(0, 10),
      recorded_by: staff.id,
      receipt_note: input.receiptNote ?? null,
      created_at: now,
      updated_at: now,
    };

    writeWithSync("expenses", id, "insert", row, (db) => {
      db.prepare(
        `INSERT INTO expenses (id, category, description, amount, expense_date, recorded_by, receipt_note, created_at, updated_at)
         VALUES (@id, @category, @description, @amount, @expense_date, @recorded_by, @receipt_note, @created_at, @updated_at)`
      ).run(row);
    });

    const auditId = newId();
    writeWithSync(
      "audit_log",
      auditId,
      "insert",
      { id: auditId, actor_id: staff.id, action: "expense_recorded", entity: "expenses", entity_id: id, details: JSON.stringify({ category: input.category, amount: input.amount }), created_at: now },
      (db) => {
        db.prepare(
          `INSERT INTO audit_log (id, actor_id, action, entity, entity_id, details, created_at) VALUES (?, ?, 'expense_recorded', 'expenses', ?, ?, ?)`
        ).run(auditId, staff.id, id, JSON.stringify({ category: input.category, amount: input.amount }), now);
      }
    );

    revalidatePath("/dashboard/accountant/expenses");
    return { data: row };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expenses")
    .insert({ category: input.category, description: input.description, amount: input.amount, recorded_by: staff.id, receipt_note: input.receiptNote ?? null })
    .select()
    .single();

  if (error) return { error: "Could not record expense." };

  await supabase.from("audit_log").insert({
    actor_id: staff.id,
    action: "expense_recorded",
    entity: "expenses",
    entity_id: data.id,
    details: { category: input.category, amount: input.amount },
  });

  revalidatePath("/dashboard/accountant/expenses");
  return { data };
}

export async function getRecentExpenses(limit = 30) {
  if (isLocalMode()) {
    const db = getLocalDb();
    const rows = db
      .prepare(
        `SELECT e.*, st.full_name as staff_name FROM expenses e
         LEFT JOIN staff st ON st.id = e.recorded_by
         WHERE e.deleted = 0 ORDER BY e.expense_date DESC, e.created_at DESC LIMIT ?`
      )
      .all(limit) as any[];
    return rows.map((r) => ({ ...r, staff: { full_name: r.staff_name } }));
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("expenses")
    .select("*, staff:recorded_by(full_name)")
    .order("expense_date", { ascending: false })
    .limit(limit);
  return data ?? [];
}

// Simple income-vs-expense summary for the current month, for the Director's
// financial picture (income comes from payments already recorded).
export async function getMonthlyFinancialSummary() {
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().slice(0, 10);

  if (isLocalMode()) {
    const db = getLocalDb();
    const income = db
      .prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE deleted = 0 AND date(paid_at) >= ?`)
      .get(monthStartStr) as { total: number };
    const expenses = db
      .prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE deleted = 0 AND expense_date >= ?`)
      .get(monthStartStr) as { total: number };
    const byCategory = db
      .prepare(`SELECT category, COALESCE(SUM(amount), 0) as total FROM expenses WHERE deleted = 0 AND expense_date >= ? GROUP BY category`)
      .all(monthStartStr) as { category: string; total: number }[];

    return { income: income.total, expenses: expenses.total, byCategory };
  }

  const supabase = await createClient();
  const { data: payments } = await supabase.from("payments").select("amount").gte("paid_at", `${monthStartStr}T00:00:00`);
  const { data: expenseRows } = await supabase.from("expenses").select("category, amount").gte("expense_date", monthStartStr);

  const income = (payments ?? []).reduce((s: number, p: any) => s + Number(p.amount), 0);
  const expenses = (expenseRows ?? []).reduce((s: number, e: any) => s + Number(e.amount), 0);

  const categoryMap = new Map<string, number>();
  for (const e of expenseRows ?? []) {
    categoryMap.set(e.category, (categoryMap.get(e.category) ?? 0) + Number(e.amount));
  }
  const byCategory = Array.from(categoryMap.entries()).map(([category, total]) => ({ category, total }));

  return { income, expenses, byCategory };
}
