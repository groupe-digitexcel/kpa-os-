import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/supabase/server";

const ROLE_DASHBOARD_PATH: Record<string, string> = {
  super_admin: "/dashboard/super-admin",
  director: "/dashboard/director",
  accountant: "/dashboard/accountant",
  secretary: "/dashboard/secretary",
  teacher: "/dashboard/teacher",
  auditor: "/dashboard/auditor",
};

export default async function DashboardRoot() {
  const staff = await getCurrentStaff();

  if (!staff) redirect("/login");

  redirect(ROLE_DASHBOARD_PATH[staff.role] ?? "/login");
}
