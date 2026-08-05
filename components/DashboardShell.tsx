import { ReactNode } from "react";
import { getEffectiveStaff } from "@/lib/data/currentStaff";
import SyncStatusBadge from "@/components/SyncStatusBadge";
import PinSetupPrompt from "@/components/PinSetupPrompt";
import MobileNav from "@/components/MobileNav";
import QuickActionsBar from "@/components/QuickActionsBar";
import { getSchoolSettings } from "@/lib/actions/settings";

const NAV_BY_ROLE: Record<string, { label: string; href: string }[]> = {
  director: [
    { label: "Overview", href: "/dashboard/director" },
    { label: "Analytics", href: "/dashboard/director/analytics" },
    { label: "Fee Regularization", href: "/dashboard/director/fees" },
    { label: "Fee Structure", href: "/dashboard/director/fee-structure" },
    { label: "Classes", href: "/dashboard/director/classes" },
    { label: "Staff", href: "/dashboard/director/staff" },
    { label: "Promotion", href: "/dashboard/director/promotion" },
    { label: "Timetable", href: "/dashboard/director/timetable" },
    { label: "Staff Attendance", href: "/dashboard/director/staff-attendance" },
    { label: "Incidents", href: "/dashboard/director/incidents" },
    { label: "Sync Conflicts", href: "/dashboard/director/sync-conflicts" },
    { label: "Backups", href: "/dashboard/director/backups" },
    { label: "Settings", href: "/dashboard/director/settings" },
    { label: "Audit Log", href: "/dashboard/director/audit" },
  ],
  accountant: [
    { label: "Overview", href: "/dashboard/accountant" },
    { label: "Reconciliation Approvals", href: "/dashboard/accountant/reconciliation" },
    { label: "Expenses", href: "/dashboard/accountant/expenses" },
    { label: "Payments", href: "/dashboard/accountant/payments" },
  ],
  secretary: [
    { label: "Overview", href: "/dashboard/secretary" },
    { label: "Students", href: "/dashboard/secretary/students" },
    { label: "Admissions", href: "/dashboard/secretary/admissions" },
    { label: "Sponsors", href: "/dashboard/secretary/sponsors" },
    { label: "Payments / Bursar", href: "/dashboard/secretary/payments" },
    { label: "Daily Reconciliation", href: "/dashboard/secretary/reconciliation" },
    { label: "Attendance Check", href: "/dashboard/secretary/attendance" },
    { label: "Arrival / Departure", href: "/dashboard/secretary/arrivals" },
    { label: "Health Records", href: "/dashboard/secretary/health" },
    { label: "Inventory", href: "/dashboard/secretary/inventory" },
    { label: "Documents / SMS", href: "/dashboard/secretary/documents" },
  ],
  teacher: [
    { label: "My Class", href: "/dashboard/teacher" },
    { label: "Attendance", href: "/dashboard/teacher/attendance" },
    { label: "Gradebook", href: "/dashboard/teacher/gradebook" },
    { label: "Timetable", href: "/dashboard/teacher/timetable" },
  ],
};

export default async function DashboardShell({ children }: { children: ReactNode }) {
  const staff = await getEffectiveStaff();
  const nav = staff ? NAV_BY_ROLE[staff.role] ?? [] : [];
  const settings = await getSchoolSettings();

  return (
    <div className="flex min-h-screen bg-kpa-cream">
      {staff && (
        <MobileNav nav={nav} schoolName={settings.school_name} role={staff.role} fullName={staff.full_name} />
      )}
      <aside className="w-64 bg-kpa-navy text-white p-5 hidden md:flex md:flex-col">
        <div className="mb-8">
          <p className="font-bold text-kpa-gold text-lg leading-tight">{settings.school_name}</p>
          <p className="text-xs text-white/60 capitalize">{staff?.role}</p>
        </div>
        <nav className="flex flex-col gap-1 text-sm">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="px-3 py-2 rounded-lg hover:bg-white/10 transition"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="mt-auto pt-6">
          <SyncStatusBadge />
          <div className="text-xs text-white/50 mt-2">{staff?.full_name}</div>
        </div>
      </aside>
      <main className="flex-1 p-6 pb-20 md:pb-6">
        <PinSetupPrompt />
        {children}
      </main>
      {staff && <QuickActionsBar role={staff.role} />}
    </div>
  );
}
