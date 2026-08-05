import DashboardShell from "@/components/DashboardShell";
import { getStaffAttendanceToday } from "@/lib/actions/staffAttendance";

export default async function StaffAttendancePage() {
  const rows = await getStaffAttendanceToday();

  return (
    <DashboardShell>
      <h1 className="text-2xl font-bold text-kpa-navy mb-1">Staff Attendance</h1>
      <p className="text-sm text-gray-500 mb-6">{new Date().toLocaleDateString()}</p>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y">
        {(rows as any[]).map((r) => (
          <div key={r.id} className="p-4 flex items-center justify-between text-sm">
            <div>
              <p className="font-medium text-kpa-navy">{r.staff?.full_name}</p>
              <p className="text-xs text-gray-500 capitalize">{r.staff?.role}</p>
            </div>
            <div className="text-right text-xs text-gray-500">
              <p>In: {r.clock_in ? new Date(r.clock_in).toLocaleTimeString() : "—"}</p>
              <p>Out: {r.clock_out ? new Date(r.clock_out).toLocaleTimeString() : "—"}</p>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="p-5 text-sm text-gray-400">No one has clocked in today yet.</p>
        )}
      </div>
    </DashboardShell>
  );
}
