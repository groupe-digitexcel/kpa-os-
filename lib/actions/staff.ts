"use server";

import { createClient } from "@/lib/supabase/server";
import { getLocalDb, newId, nowIso, writeWithSync } from "@/lib/db/local";
import { getEffectiveStaff } from "@/lib/data/currentStaff";
import { isLocalMode } from "@/lib/data/mode";
import { revalidatePath } from "next/cache";

export async function listStaff() {
  if (isLocalMode()) {
    const db = getLocalDb();
    return db.prepare(`SELECT * FROM staff WHERE deleted = 0 ORDER BY role, full_name`).all();
  }

  const supabase = await createClient();
  const { data } = await supabase.from("staff").select("*").order("role").order("full_name");
  return data ?? [];
}

export type CreateStaffInput = {
  fullName: string;
  role: "director" | "accountant" | "secretary" | "teacher" | "auditor";
  phone?: string;
  email: string;
  password: string;
};

// Creates both the Supabase Auth account AND the staff record. Requires
// internet even in local mode (creating an Auth user always needs the cloud)
// — this is a one-time setup action per staff member, not a daily operation.
export async function createStaffMember(input: CreateStaffInput) {
  const requester = await getEffectiveStaff();
  if (!requester || requester.role !== "director") return { error: "Only the Director can add staff." };

  const supabase = await createClient();

  // Requires the service role key server-side to create an Auth user directly
  // (admin API). Falls back to a clear error if not configured, rather than
  // silently failing.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      error:
        "Staff account creation needs SUPABASE_SERVICE_ROLE_KEY set in your environment. Add it in Vercel/​.env.local, then try again.",
    };
  }

  const { createClient: createAdminClient } = await import("@supabase/supabase-js");
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  });

  if (authError || !authUser.user) {
    return { error: authError?.message ?? "Could not create the login account." };
  }

  const { data: staffRow, error: staffError } = await supabase
    .from("staff")
    .insert({
      auth_user_id: authUser.user.id,
      full_name: input.fullName,
      role: input.role,
      phone: input.phone ?? null,
      email: input.email,
      active: true,
    })
    .select()
    .single();

  if (staffError) return { error: "Auth account created, but staff record failed: " + staffError.message };

  await supabase.from("audit_log").insert({
    actor_id: requester.id,
    action: "staff_created",
    entity: "staff",
    entity_id: staffRow.id,
    details: { full_name: input.fullName, role: input.role },
  });

  revalidatePath("/dashboard/director/staff");
  return { data: staffRow };
}

export async function toggleStaffActive(staffId: string, active: boolean) {
  const requester = await getEffectiveStaff();
  if (!requester || requester.role !== "director") return { error: "Only the Director can do this." };

  if (isLocalMode()) {
    const db = getLocalDb();
    const now = nowIso();
    writeWithSync("staff", staffId, "update", { id: staffId, active: active ? 1 : 0, updated_at: now }, (db) => {
      db.prepare(`UPDATE staff SET active = ?, updated_at = ? WHERE id = ?`).run(active ? 1 : 0, now, staffId);
    });
    revalidatePath("/dashboard/director/staff");
    return { success: true };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("staff").update({ active }).eq("id", staffId);
  if (error) return { error: "Could not update staff status." };

  await supabase.from("audit_log").insert({
    actor_id: requester.id,
    action: active ? "staff_reactivated" : "staff_deactivated",
    entity: "staff",
    entity_id: staffId,
  });

  revalidatePath("/dashboard/director/staff");
  return { success: true };
}

export async function updateStaffRole(staffId: string, role: CreateStaffInput["role"]) {
  const requester = await getEffectiveStaff();
  if (!requester || requester.role !== "director") return { error: "Only the Director can do this." };

  if (isLocalMode()) {
    const db = getLocalDb();
    const now = nowIso();
    writeWithSync("staff", staffId, "update", { id: staffId, role, updated_at: now }, (db) => {
      db.prepare(`UPDATE staff SET role = ?, updated_at = ? WHERE id = ?`).run(role, now, staffId);
    });
    revalidatePath("/dashboard/director/staff");
    return { success: true };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("staff").update({ role }).eq("id", staffId);
  if (error) return { error: "Could not update role." };
  revalidatePath("/dashboard/director/staff");
  return { success: true };
}
