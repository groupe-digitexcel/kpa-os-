"use client";

import BilingualText from "@/components/BilingualText";

type Action = { fr: string; en: string; href: string; icon: string };

const QUICK_ACTIONS: Record<string, Action[]> = {
  super_admin: [
    { fr: "Administration", en: "Administration", href: "/dashboard/super-admin", icon: "🛡️" },
  ],
  director: [
    { fr: "Aperçu", en: "Overview", href: "/dashboard/director", icon: "🏠" },
    { fr: "Analytique", en: "Analytics", href: "/dashboard/director/analytics", icon: "📊" },
    { fr: "Personnel", en: "Staff", href: "/dashboard/director/staff", icon: "👥" },
    { fr: "Réglages", en: "Settings", href: "/dashboard/director/settings", icon: "⚙️" },
  ],
  accountant: [
    { fr: "Aperçu", en: "Overview", href: "/dashboard/accountant", icon: "🏠" },
    { fr: "Réconciliation", en: "Reconciliation", href: "/dashboard/accountant/reconciliation", icon: "✅" },
    { fr: "Dépenses", en: "Expenses", href: "/dashboard/accountant/expenses", icon: "💵" },
  ],
  secretary: [
    { fr: "Paiement", en: "Payment", href: "/dashboard/secretary/payments", icon: "💰" },
    { fr: "Arrivée/Départ", en: "Arrival/Departure", href: "/dashboard/secretary/arrivals", icon: "🚶" },
    { fr: "Présence", en: "Attendance", href: "/dashboard/secretary/attendance", icon: "📋" },
    { fr: "Élèves", en: "Students", href: "/dashboard/secretary/students", icon: "🎓" },
  ],
  teacher: [
    { fr: "Ma classe", en: "My Class", href: "/dashboard/teacher", icon: "🏠" },
    { fr: "Présence", en: "Attendance", href: "/dashboard/teacher/attendance", icon: "📋" },
    { fr: "Notes", en: "Grades", href: "/dashboard/teacher/gradebook", icon: "📝" },
    { fr: "Horaire", en: "Timetable", href: "/dashboard/teacher/timetable", icon: "🗓️" },
  ],
  auditor: [
    { fr: "Audit", en: "Audit", href: "/dashboard/auditor", icon: "🔎" },
  ],
};

export default function QuickActionsBar({ role }: { role: string }) {
  const actions = QUICK_ACTIONS[role] ?? [];
  if (actions.length === 0) return null;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.06)] flex">
      {actions.map((a) => (
        <a
          key={a.href}
          href={a.href}
          className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 active:bg-kpa-cream"
        >
          <span className="text-lg leading-none">{a.icon}</span>
          <BilingualText fr={a.fr} en={a.en} className="text-[10.5px] text-kpa-navy font-medium leading-none" />
        </a>
      ))}
    </nav>
  );
}
