import DashboardShell from "@/components/DashboardShell";
import { getEffectiveStaff } from "@/lib/data/currentStaff";
import { getMyTimetable } from "@/lib/actions/timetable";

const DAY_LABELS: Record<number, string> = { 2: "Monday", 3: "Tuesday", 4: "Wednesday", 5: "Thursday", 6: "Friday" };

export default async function TeacherTimetablePage() {
  const staff = await getEffectiveStaff();
  const periods = staff ? await getMyTimetable(staff.id) : [];

  const byDay: Record<number, any[]> = {};
  for (const p of periods as any[]) {
    if (!byDay[p.day_of_week]) byDay[p.day_of_week] = [];
    byDay[p.day_of_week].push(p);
  }

  return (
    <DashboardShell>
      <h1 className="text-2xl font-bold text-kpa-navy mb-1">My Timetable</h1>
      <p className="text-sm text-gray-500 mb-6">Weekly schedule</p>

      <div className="space-y-4">
        {[2, 3, 4, 5, 6].map((day) => (
          <div key={day} className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-3 border-b border-gray-100 bg-kpa-cream">
              <p className="font-semibold text-kpa-navy text-sm">{DAY_LABELS[day]}</p>
            </div>
            <div className="divide-y">
              {(byDay[day] ?? []).map((p) => (
                <div key={p.id} className="p-3 flex justify-between text-sm">
                  <div>
                    <p className="text-kpa-navy font-medium">{p.subject?.name}</p>
                    <p className="text-xs text-gray-500">{p.class?.name}{p.room ? ` · ${p.room}` : ""}</p>
                  </div>
                  <span className="text-xs text-gray-400">{p.start_time}–{p.end_time}</span>
                </div>
              ))}
              {(!byDay[day] || byDay[day].length === 0) && (
                <p className="p-3 text-xs text-gray-400">No periods scheduled.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}
