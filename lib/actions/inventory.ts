"use server";

import { createClient } from "@/lib/supabase/server";
import { getLocalDb, newId, nowIso, writeWithSync } from "@/lib/db/local";
import { getEffectiveStaff } from "@/lib/data/currentStaff";
import { isLocalMode } from "@/lib/data/mode";
import { revalidatePath } from "next/cache";

export async function listInventory() {
  if (isLocalMode()) {
    const db = getLocalDb();
    return db
      .prepare(`SELECT * FROM inventory_items WHERE deleted = 0 ORDER BY category, name`)
      .all();
  }

  const supabase = await createClient();
  const { data } = await supabase.from("inventory_items").select("*").order("category").order("name");
  return data ?? [];
}

export async function createInventoryItem(input: {
  name: string;
  category: "uniform" | "sportswear" | "stationery" | "equipment" | "other";
  quantity: number;
  unitPrice?: number;
  reorderThreshold?: number;
}) {
  const staff = await getEffectiveStaff();
  if (!staff) return { error: "Not authenticated" };

  if (isLocalMode()) {
    const db = getLocalDb();
    const id = newId();
    const now = nowIso();
    const row = {
      id,
      name: input.name,
      category: input.category,
      unit: "pcs",
      quantity_on_hand: input.quantity,
      reorder_threshold: input.reorderThreshold ?? 10,
      unit_price: input.unitPrice ?? null,
      created_at: now,
      updated_at: now,
    };

    writeWithSync("inventory_items", id, "insert", row, (db) => {
      db.prepare(
        `INSERT INTO inventory_items (id, name, category, unit, quantity_on_hand, reorder_threshold, unit_price, created_at, updated_at)
         VALUES (@id, @name, @category, @unit, @quantity_on_hand, @reorder_threshold, @unit_price, @created_at, @updated_at)`
      ).run(row);
    });

    const txnId = newId();
    writeWithSync(
      "inventory_transactions",
      txnId,
      "insert",
      { id: txnId, item_id: id, transaction_type: "stock_in", quantity: input.quantity, authorized_by: staff.id, notes: "Initial stock", created_at: now, updated_at: now },
      (db) => {
        db.prepare(
          `INSERT INTO inventory_transactions (id, item_id, transaction_type, quantity, authorized_by, notes, created_at, updated_at)
           VALUES (?, ?, 'stock_in', ?, ?, 'Initial stock', ?, ?)`
        ).run(txnId, id, input.quantity, staff.id, now, now);
      }
    );

    revalidatePath("/dashboard/secretary/inventory");
    return { data: row };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory_items")
    .insert({ name: input.name, category: input.category, quantity_on_hand: input.quantity, unit_price: input.unitPrice ?? null, reorder_threshold: input.reorderThreshold ?? 10 })
    .select()
    .single();

  if (error) return { error: "Could not create item." };

  await supabase.from("inventory_transactions").insert({
    item_id: data.id,
    transaction_type: "stock_in",
    quantity: input.quantity,
    authorized_by: staff.id,
    notes: "Initial stock",
  });

  revalidatePath("/dashboard/secretary/inventory");
  return { data };
}

export async function stockIn(itemId: string, quantity: number, notes?: string) {
  const staff = await getEffectiveStaff();
  if (!staff) return { error: "Not authenticated" };

  if (isLocalMode()) {
    const db = getLocalDb();
    const now = nowIso();
    const item = db.prepare(`SELECT quantity_on_hand FROM inventory_items WHERE id = ?`).get(itemId) as
      | { quantity_on_hand: number }
      | undefined;
    const newQty = (item?.quantity_on_hand ?? 0) + quantity;

    writeWithSync(
      "inventory_items",
      itemId,
      "update",
      { id: itemId, quantity_on_hand: newQty, updated_at: now },
      (db) => {
        db.prepare(`UPDATE inventory_items SET quantity_on_hand = ?, updated_at = ? WHERE id = ?`).run(newQty, now, itemId);
      }
    );

    const txnId = newId();
    writeWithSync(
      "inventory_transactions",
      txnId,
      "insert",
      { id: txnId, item_id: itemId, transaction_type: "stock_in", quantity, authorized_by: staff.id, notes: notes ?? null, created_at: now, updated_at: now },
      (db) => {
        db.prepare(
          `INSERT INTO inventory_transactions (id, item_id, transaction_type, quantity, authorized_by, notes, created_at, updated_at)
           VALUES (?, ?, 'stock_in', ?, ?, ?, ?, ?)`
        ).run(txnId, itemId, quantity, staff.id, notes ?? null, now, now);
      }
    );

    revalidatePath("/dashboard/secretary/inventory");
    return { success: true };
  }

  const supabase = await createClient();
  const { data: item } = await supabase.from("inventory_items").select("quantity_on_hand").eq("id", itemId).single();

  await supabase.from("inventory_items").update({ quantity_on_hand: (item?.quantity_on_hand ?? 0) + quantity }).eq("id", itemId);

  await supabase.from("inventory_transactions").insert({
    item_id: itemId,
    transaction_type: "stock_in",
    quantity,
    authorized_by: staff.id,
    notes: notes ?? null,
  });

  revalidatePath("/dashboard/secretary/inventory");
  return { success: true };
}

export type IssueItemInput = {
  itemId: string;
  quantity: number;
  studentId?: string;
  transactionType: "issued_free" | "sold" | "damaged" | "adjustment";
  flaggedResale?: boolean;
  notes?: string;
};

export async function issueItem(input: IssueItemInput) {
  const staff = await getEffectiveStaff();
  if (!staff) return { error: "Not authenticated" };

  if (isLocalMode()) {
    const db = getLocalDb();
    const now = nowIso();

    const item = db
      .prepare(`SELECT quantity_on_hand, name FROM inventory_items WHERE id = ?`)
      .get(input.itemId) as { quantity_on_hand: number; name: string } | undefined;

    if (!item || item.quantity_on_hand < input.quantity) {
      return { error: "Not enough stock on hand." };
    }

    const newQty = item.quantity_on_hand - input.quantity;
    writeWithSync(
      "inventory_items",
      input.itemId,
      "update",
      { id: input.itemId, quantity_on_hand: newQty, updated_at: now },
      (db) => {
        db.prepare(`UPDATE inventory_items SET quantity_on_hand = ?, updated_at = ? WHERE id = ?`).run(newQty, now, input.itemId);
      }
    );

    const txnId = newId();
    const txnRow = {
      id: txnId,
      item_id: input.itemId,
      transaction_type: input.transactionType,
      quantity: input.quantity,
      student_id: input.studentId || null,
      authorized_by: staff.id,
      flagged_resale: input.flaggedResale ? 1 : 0,
      notes: input.notes ?? null,
      created_at: now,
      updated_at: now,
    };

    writeWithSync("inventory_transactions", txnId, "insert", txnRow, (db) => {
      db.prepare(
        `INSERT INTO inventory_transactions (id, item_id, transaction_type, quantity, student_id, authorized_by, flagged_resale, notes, created_at, updated_at)
         VALUES (@id, @item_id, @transaction_type, @quantity, @student_id, @authorized_by, @flagged_resale, @notes, @created_at, @updated_at)`
      ).run(txnRow);
    });

    if (input.flaggedResale) {
      const auditId = newId();
      writeWithSync(
        "audit_log",
        auditId,
        "insert",
        { id: auditId, actor_id: staff.id, action: "uniform_resale_flagged", entity: "inventory_transactions", entity_id: txnId, details: JSON.stringify({ item: item.name, quantity: input.quantity }), created_at: now },
        (db) => {
          db.prepare(
            `INSERT INTO audit_log (id, actor_id, action, entity, entity_id, details, created_at)
             VALUES (?, ?, 'uniform_resale_flagged', 'inventory_transactions', ?, ?, ?)`
          ).run(auditId, staff.id, txnId, JSON.stringify({ item: item.name, quantity: input.quantity }), now);
        }
      );
    }

    revalidatePath("/dashboard/secretary/inventory");
    return { data: txnRow };
  }

  const supabase = await createClient();
  const { data: item } = await supabase.from("inventory_items").select("quantity_on_hand, name").eq("id", input.itemId).single();

  if (!item || item.quantity_on_hand < input.quantity) {
    return { error: "Not enough stock on hand." };
  }

  await supabase.from("inventory_items").update({ quantity_on_hand: item.quantity_on_hand - input.quantity }).eq("id", input.itemId);

  const { data: txn, error } = await supabase
    .from("inventory_transactions")
    .insert({
      item_id: input.itemId,
      transaction_type: input.transactionType,
      quantity: input.quantity,
      student_id: input.studentId || null,
      authorized_by: staff.id,
      flagged_resale: input.flaggedResale ?? false,
      notes: input.notes ?? null,
    })
    .select()
    .single();

  if (error) return { error: "Could not record transaction." };

  if (input.flaggedResale) {
    await supabase.from("audit_log").insert({
      actor_id: staff.id,
      action: "uniform_resale_flagged",
      entity: "inventory_transactions",
      entity_id: txn.id,
      details: { item: item.name, quantity: input.quantity },
    });
  }

  revalidatePath("/dashboard/secretary/inventory");
  return { data: txn };
}

export async function getRecentInventoryTransactions(limit = 15) {
  if (isLocalMode()) {
    const db = getLocalDb();
    const rows = db
      .prepare(
        `SELECT it.*, i.name as item_name, s.full_name as student_name, st.full_name as staff_name
         FROM inventory_transactions it
         LEFT JOIN inventory_items i ON i.id = it.item_id
         LEFT JOIN students s ON s.id = it.student_id
         LEFT JOIN staff st ON st.id = it.authorized_by
         WHERE it.deleted = 0
         ORDER BY it.created_at DESC LIMIT ?`
      )
      .all(limit) as any[];

    return rows.map((r) => ({
      ...r,
      item: { name: r.item_name },
      student: r.student_name ? { full_name: r.student_name } : null,
      staff: { full_name: r.staff_name },
    }));
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("inventory_transactions")
    .select("*, item:inventory_items(name), student:students(full_name), staff:authorized_by(full_name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}
