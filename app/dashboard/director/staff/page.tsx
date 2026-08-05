import DashboardShell from "@/components/DashboardShell";
import AddStaffForm from "@/components/AddStaffForm";
import StaffList from "@/components/StaffList";
import { listStaff } from "@/lib/actions/staff";

export default async function StaffPage() {
  const staff = await listStaff();

  return (
    <DashboardShell>
      <h1 className="text-2xl font-bold text-kpa-navy mb-1">Staff</h1>
      <p className="text-sm text-gray-500 mb-6">Manage logins, roles, and active status</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AddStaffForm />
        <StaffList staff={staff as any[]} />
      </div>
    </DashboardShell>
  );
}
