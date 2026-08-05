"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleStaffActive, updateStaffRole } from "@/lib/actions/staff";

const ROLES = ["director", "accountant", "secretary", "teacher", "auditor"];

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
      {staff.map((s) => (
        <div key={s.id} className="p-4 flex items-center justify-between text-sm">
          <div>
            <p className="font-medium text-kpa-navy">{s.full_name}</p>
            <p className="text-xs text-gray-500">{s.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={s.role}
              onChange={(e) => handleRoleChange(s.id, e.target.value)}
              disabled={isPending}
              className="text-xs border border-gray-300 rounded-lg px-2 py-1 capitalize focus:outline-none focus:ring-2 focus:ring-kpa-gold"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <button
              onClick={() => handleToggle(s.id, !!s.active)}
              disabled={isPending}
              className={`text-xs px-3 py-1 rounded-lg font-medium ${
                s.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
              }`}
            >
              {s.active ? "Active" : "Inactive"}
            </button>
          </div>
        </div>
      ))}
      {staff.length === 0 && <p className="p-5 text-sm text-gray-400">No staff yet.</p>}
    </div>
  );
}
