const QUICK_ACTIONS: Record<string, { label: string; href: string; icon: string }[]> = {
  director: [
    { label: "Aperçu", href: "/dashboard/director", icon: "🏠" },
    { label: "Analytique", href: "/dashboard/director/analytics", icon: "📊" },
    { label: "Personnel", href: "/dashboard/director/staff", icon: "👥" },
    { label: "Réglages", href: "/dashboard/director/settings", icon: "⚙️" },
  ],
  accountant: [
    { label: "Aperçu", href: "/dashboard/accountant", icon: "🏠" },
    { label: "Réconciliation", href: "/dashboard/accountant/reconciliation", icon: "✅" },
    { label: "Dépenses", href: "/dashboard/accountant/expenses", icon: "💵" },
  ],
  secretary: [
    { label: "Paiement", href: "/dashboard/secretary/payments", icon: "💰" },
    { label: "Arrivée/Départ", href: "/dashboard/secretary/arrivals", icon: "🚶" },
    { label: "Présence", href: "/dashboard/secretary/attendance", icon: "📋" },
    { label: "Élèves", href: "/dashboard/secretary/students", icon: "🎓" },
  ],
  teacher: [
    { label: "Ma Classe", href: "/dashboard/teacher", icon: "🏠" },
    { label: "Présence", href: "/dashboard/teacher/attendance", icon: "📋" },
    { label: "Notes", href: "/dashboard/teacher/gradebook", icon: "📝" },
    { label: "Horaire", href: "/dashboard/teacher/timetable", icon: "🗓️" },
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
          <span className="text-[10.5px] text-kpa-navy font-medium leading-none">{a.label}</span>
        </a>
      ))}
    </nav>
  );
}
