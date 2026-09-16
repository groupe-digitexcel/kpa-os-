import { ReactNode } from "react";
import { getEffectiveStaff } from "@/lib/data/currentStaff";
import SyncStatusBadge from "@/components/SyncStatusBadge";
import PinSetupPrompt from "@/components/PinSetupPrompt";
import MobileNav from "@/components/MobileNav";
import QuickActionsBar from "@/components/QuickActionsBar";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import BilingualText, { roleLabel } from "@/components/BilingualText";
import { getSchoolSettings } from "@/lib/actions/settings";

const NAV_BY_ROLE: Record<string, { fr: string; en: string; href: string }[]> = {
  director: [
    { fr: "Vue d’ensemble", en: "Overview", href: "/dashboard/director" },
    { fr: "Analyses", en: "Analytics", href: "/dashboard/director/analytics" },
    { fr: "Régularisation des frais", en: "Fee Regularization", href: "/dashboard/director/fees" },
    { fr: "Grille tarifaire", en: "Fee Structure", href: "/dashboard/director/fee-structure" },
    { fr: "Classes", en: "Classes", href: "/dashboard/director/classes" },
    { fr: "Personnel", en: "Staff", href: "/dashboard/director/staff" },
    { fr: "Promotion", en: "Promotion", href: "/dashboard/director/promotion" },
    { fr: "Emploi du temps", en: "Timetable", href: "/dashboard/director/timetable" },
    { fr: "Présence du personnel", en: "Staff Attendance", href: "/dashboard/director/staff-attendance" },
    { fr: "Incidents", en: "Incidents", href: "/dashboard/director/incidents" },
    { fr: "Conflits de synchronisation", en: "Sync Conflicts", href: "/dashboard/director/sync-conflicts" },
    { fr: "Sauvegardes", en: "Backups", href: "/dashboard/director/backups" },
    { fr: "Paramètres", en: "Settings", href: "/dashboard/director/settings" },
    { fr: "Journal d’audit", en: "Audit Log", href: "/dashboard/director/audit" },
  ],
  accountant: [
    { fr: "Vue d’ensemble", en: "Overview", href: "/dashboard/accountant" },
    { fr: "Approbations des rapprochements", en: "Reconciliation Approvals", href: "/dashboard/accountant/reconciliation" },
    { fr: "Dépenses", en: "Expenses", href: "/dashboard/accountant/expenses" },
    { fr: "Paiements", en: "Payments", href: "/dashboard/accountant/payments" },
  ],
  secretary: [
    { fr: "Vue d’ensemble", en: "Overview", href: "/dashboard/secretary" },
    { fr: "Élèves", en: "Students", href: "/dashboard/secretary/students" },
    { fr: "Admissions", en: "Admissions", href: "/dashboard/secretary/admissions" },
    { fr: "Parrains", en: "Sponsors", href: "/dashboard/secretary/sponsors" },
    { fr: "Paiements / Intendance", en: "Payments / Bursar", href: "/dashboard/secretary/payments" },
    { fr: "Rapprochement quotidien", en: "Daily Reconciliation", href: "/dashboard/secretary/reconciliation" },
    { fr: "Contrôle des présences", en: "Attendance Check", href: "/dashboard/secretary/attendance" },
    { fr: "Arrivées / Départs", en: "Arrival / Departure", href: "/dashboard/secretary/arrivals" },
    { fr: "Dossiers de santé", en: "Health Records", href: "/dashboard/secretary/health" },
    { fr: "Inventaire", en: "Inventory", href: "/dashboard/secretary/inventory" },
    { fr: "Documents / SMS", en: "Documents / SMS", href: "/dashboard/secretary/documents" },
  ],
  teacher: [
    { fr: "Ma classe", en: "My Class", href: "/dashboard/teacher" },
    { fr: "Présences", en: "Attendance", href: "/dashboard/teacher/attendance" },
    { fr: "Carnet de notes", en: "Gradebook", href: "/dashboard/teacher/gradebook" },
    { fr: "Emploi du temps", en: "Timetable", href: "/dashboard/teacher/timetable" },
  ],
};

export default async function DashboardShell({ children }: { children: ReactNode }) {
  const staff = await getEffectiveStaff();
  const nav = staff ? NAV_BY_ROLE[staff.role] ?? [] : [];
  const settings = await getSchoolSettings();
  const role = staff ? roleLabel(staff.role) : { fr: "", en: "" };

  return (
    <div className="flex min-h-screen bg-kpa-cream">
      {staff && <MobileNav nav={nav} schoolName={settings.school_name} role={staff.role} fullName={staff.full_name} />}
      <aside className="w-64 bg-kpa-navy text-white p-5 hidden md:flex md:flex-col">
        <div className="mb-8">
          <p className="font-bold text-kpa-gold text-lg leading-tight">{settings.school_name}</p>
          <BilingualText fr={role.fr} en={role.en} className="text-xs text-white/60 capitalize" />
        </div>
        <div className="flex justify-end mb-4"><LanguageSwitcher /></div>
        <nav className="flex flex-col gap-1 text-sm">
          {nav.map((item) => (
            <a key={item.href} href={item.href} className="px-3 py-2 rounded-lg hover:bg-white/10 transition">
              <BilingualText fr={item.fr} en={item.en} />
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
