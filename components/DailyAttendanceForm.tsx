"use client";

import { useState, useTransition } from "react";
import { markDailyAttendance } from "@/lib/actions/attendance";
import BilingualText from "@/components/BilingualText";

type RosterEntry = { id: string; full_name: string; present: boolean };

export default function DailyAttendanceForm({ initialRoster }: { initialRoster: RosterEntry[] }) {
  const [roster, setRoster] = useState(initialRoster);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function toggle(id: string) {
    setRoster((prev) => prev.map((s) => (s.id === id ? { ...s, present: !s.present } : s)));
    setSaved(false);
  }

  function handleSave() {
    startTransition(async () => {
      await markDailyAttendance(roster.map((s) => ({ studentId: s.id, present: s.present })));
      setSaved(true);
    });
  }

  const presentCount = roster.filter((s) => s.present).length;

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <p className="text-sm text-gray-500">{presentCount} / {roster.length} <BilingualText fr="présents aujourd’hui" en="present today" /></p>
        <button onClick={handleSave} disabled={isPending} className="bg-kpa-navy text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-kpa-navy/90 disabled:opacity-50">
          {isPending ? <BilingualText fr="Enregistrement..." en="Saving..." /> : saved ? "Saved ✓ / Enregistré ✓" : <BilingualText fr="Enregistrer les présences" en="Save Attendance" />}
        </button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y">
        {roster.map((s) => (
          <button key={s.id} onClick={() => toggle(s.id)} className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-kpa-cream text-left">
            <span className="text-kpa-navy font-medium">{s.full_name}</span>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${s.present ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
              {s.present ? <BilingualText fr="Présent" en="Present" /> : <BilingualText fr="Absent" en="Absent" />}
            </span>
          </button>
        ))}
        {roster.length === 0 && <p className="p-5 text-sm text-gray-400"><BilingualText fr="Aucun élève dans cette classe." en="No students in this class." /></p>}
      </div>
    </div>
  );
}
