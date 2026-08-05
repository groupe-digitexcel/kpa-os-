import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/supabase/server";

export default async function DashboardRoot() {
  const staff = await getCurrentStaff();

  if (!staff) redirect("/login");

  redirect(`/dashboard/${staff.role}`);
}
