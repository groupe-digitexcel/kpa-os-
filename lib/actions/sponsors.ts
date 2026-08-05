"use server";

import { createClient } from "@/lib/supabase/server";
import { getLocalDb, newId, nowIso, writeWithSync } from "@/lib/db/local";
import { getEffectiveStaff } from "@/lib/data/currentStaff";
import { isLocalMode } from "@/lib/data/mode";
import { revalidatePath } from "next/cache";

export type SponsorStatus = "identified" | "letter_sent" | "follow_up" | "committed" | "received" | "declined";

export async function listSponsors() {
  if (isLocalMode()) {
    const db = getLocalDb();
    return db.prepare(`SELECT * FROM sponsors WHERE deleted = 0 ORDER BY next_follow_up_date IS NULL, next_follow_up_date, created_at DESC`).all();
  }

  const supabase = await createClient();
  const { data } = await supabase.from("sponsors").select("*").order("created_at", { ascending: false });
  return data ?? [];
}

export type CreateSponsorInput = {
  organizationName: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  purpose?: string;
  amountRequested?: number;
  notes?: string;
};

export async function createSponsor(input: CreateSponsorInput) {
  const staff = await getEffectiveStaff();
  if (!staff) return { error: "Not authenticated" };

  if (isLocalMode()) {
    const db = getLocalDb();
    const id = newId();
    const now = nowIso();
    const row = {
      id,
      organization_name: input.organizationName,
      contact_name: input.contactName ?? null,
      contact_email: input.contactEmail ?? null,
      contact_phone: input.contactPhone ?? null,
      purpose: input.purpose ?? null,
      amount_requested: input.amountRequested ?? null,
      amount_received: 0,
      status: "identified",
      notes: input.notes ?? null,
      created_by: staff.id,
      created_at: now,
      updated_at: now,
    };

    writeWithSync("sponsors", id, "insert", row, (db) => {
      db.prepare(
        `INSERT INTO sponsors (id, organization_name, contact_name, contact_email, contact_phone, purpose, amount_requested, amount_received, status, notes, created_by, created_at, updated_at)
         VALUES (@id, @organization_name, @contact_name, @contact_email, @contact_phone, @purpose, @amount_requested, @amount_received, @status, @notes, @created_by, @created_at, @updated_at)`
      ).run(row);
    });

    revalidatePath("/dashboard/secretary/sponsors");
    return { data: row };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sponsors")
    .insert({
      organization_name: input.organizationName,
      contact_name: input.contactName ?? null,
      contact_email: input.contactEmail ?? null,
      contact_phone: input.contactPhone ?? null,
      purpose: input.purpose ?? null,
      amount_requested: input.amountRequested ?? null,
      notes: input.notes ?? null,
      created_by: staff.id,
    })
    .select()
    .single();

  if (error) return { error: "Could not save sponsor record." };
  revalidatePath("/dashboard/secretary/sponsors");
  return { data };
}

export type UpdateSponsorInput = {
  id: string;
  status?: SponsorStatus;
  amountReceived?: number;
  letterSentDate?: string;
  lastFollowUpDate?: string;
  nextFollowUpDate?: string;
  notes?: string;
};

export async function updateSponsor(input: UpdateSponsorInput) {
  const staff = await getEffectiveStaff();
  if (!staff) return { error: "Not authenticated" };

  const now = nowIso();
  const fields: Record<string, any> = { updated_at: now };
  if (input.status) fields.status = input.status;
  if (input.amountReceived !== undefined) fields.amount_received = input.amountReceived;
  if (input.letterSentDate) fields.letter_sent_date = input.letterSentDate;
  if (input.lastFollowUpDate) fields.last_follow_up_date = input.lastFollowUpDate;
  if (input.nextFollowUpDate) fields.next_follow_up_date = input.nextFollowUpDate;
  if (input.notes !== undefined) fields.notes = input.notes;

  if (isLocalMode()) {
    const db = getLocalDb();
    const setClauses = Object.keys(fields).map((k) => `${k} = @${k}`).join(", ");
    writeWithSync("sponsors", input.id, "update", { id: input.id, ...fields }, (db) => {
      db.prepare(`UPDATE sponsors SET ${setClauses} WHERE id = @id`).run({ id: input.id, ...fields });
    });
    revalidatePath("/dashboard/secretary/sponsors");
    return { success: true };
  }

  const supabase = await createClient();
  const updatePayload: Record<string, any> = {};
  if (input.status) updatePayload.status = input.status;
  if (input.amountReceived !== undefined) updatePayload.amount_received = input.amountReceived;
  if (input.letterSentDate) updatePayload.letter_sent_date = input.letterSentDate;
  if (input.lastFollowUpDate) updatePayload.last_follow_up_date = input.lastFollowUpDate;
  if (input.nextFollowUpDate) updatePayload.next_follow_up_date = input.nextFollowUpDate;
  if (input.notes !== undefined) updatePayload.notes = input.notes;

  const { error } = await supabase.from("sponsors").update(updatePayload).eq("id", input.id);
  if (error) return { error: "Could not update sponsor record." };
  revalidatePath("/dashboard/secretary/sponsors");
  return { success: true };
}
