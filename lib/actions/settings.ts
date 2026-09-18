"use server";

import { createClient } from "@/lib/supabase/server";
import { getLocalDb, nowIso, writeWithSync } from "@/lib/db/local";
import { getEffectiveStaff } from "@/lib/data/currentStaff";
import { isLocalMode } from "@/lib/data/mode";
import { revalidatePath } from "next/cache";

export type SchoolSettings = {
  school_name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  current_academic_year: string;
};

export async function getSchoolSettings(): Promise<SchoolSettings> {
  if (isLocalMode()) {
    const db = getLocalDb();
    const row = db.prepare(`SELECT * FROM school_settings WHERE id = 1`).get() as any;
    return row ?? { school_name: "Kingdom Passion Academy", address: null, phone: null, email: null, logo_url: null, current_academic_year: "2026-2027" };
  }

  const supabase = await createClient();
  const { data } = await supabase.from("school_settings").select("*").eq("id", 1).maybeSingle();
  return data ?? { school_name: "Kingdom Passion Academy", address: null, phone: null, email: null, logo_url: null, current_academic_year: "2026-2027" };
}

export async function updateSchoolSettings(input: Partial<SchoolSettings>) {
  const staff = await getEffectiveStaff();
  if (!staff || !["director", "super_admin"].includes(staff.role)) {
    return { error: "Only the Director or Super Administrator can change school settings." };
  }

  const now = nowIso();

  if (isLocalMode()) {
    const db = getLocalDb();
    const fields = { ...input, updated_by: staff.id, updated_at: now };
    const setClauses = Object.keys(fields).map((k) => `${k} = @${k}`).join(", ");

    writeWithSync("school_settings", "1", "update", { id: 1, ...fields }, (db) => {
      db.prepare(`UPDATE school_settings SET ${setClauses} WHERE id = 1`).run(fields);
    });

    revalidatePath("/dashboard/director/settings");
    revalidatePath("/dashboard/super-admin");
    return { success: true };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("school_settings").update({ ...input, updated_by: staff.id }).eq("id", 1);
  if (error) return { error: "Could not save settings." };

  revalidatePath("/dashboard/director/settings");
  revalidatePath("/dashboard/super-admin");
  return { success: true };
}
