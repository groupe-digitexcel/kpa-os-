"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleStaffActive, updateStaffRole } from "@/lib/actions/staff";
import BilingualText from "@/components/BilingualText";

const ROLES = [
  ["director", "Directeur", "Director"],
  ["accountant", "Comptable", "Accountant"],
  ["secretary", "Secrétaire / Intendant", "Secretary / Bursar"],
  ["teacher", "Enseignant", "Teacher"],
  ["auditor", "Auditeur", "Auditor"],
] as const;

export default function StaffList({ staff }: { staff: any[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleToggle(id: string, currentActive: boolean) {
    startTransition(async () => {
      await toggleStaffActive(id, !currentActive);
      router.refresh();
    });
  }

  function handleRoleChange(id: string, role: string) {
    startTransition(async () => {
      await updateStaffRole(id, role as any);
      router.refresh();
    });
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y">
      {staff.map((s) => {
        const selectedRole = ROLES.find(([value]) => value === s.role);
        return (
          <div key={s.id} className="p-4 flex items-center justify-between text-sm gap-3">
            <div className="min-w-0">
              <p className="font-medium text-kpa-navy truncate">{s.full_name}</p>
              <p className="text-xs text-gray-500 truncate">{s.email}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <select
                value={s.role}
                onChange={(e) => handleRoleChange(s.id, e.target.value)}
                disabled={isPending}
                aria-label={selectedRole ? `${selectedRole[1]} / ${selectedRole[2]}` : s.role}
                className="text-xs border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
              >
                {ROLES.map(([value, fr, en]) => (
                  <option key={value} value={value}>{fr} / {en}</option>
                ))}
              </select>
              <button
                onClick={() => handleToggle(s.id, !!s.active)}
                disabled={isPending}
                className={`text-xs px-3 py-1 rounded-lg font-medium ${
                  s.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                }`}
                aria-label={s.active ? "Désactiver / Deactivate" : "Activer / Activate"}
              >
                {s.active ? <BilingualText fr="Actif" en="Active" /> : <BilingualText fr="Inactif" en="Inactive" />}
              </button>
            </div>
          </div>
        );
      })}
      {staff.length === 0 && (
        <p className="p-5 text-sm text-gray-400">
          <BilingualText fr="Aucun membre du personnel." en="No staff yet." />
        </p>
      )}
    </div>
  );
}
