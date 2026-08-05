import DashboardShell from "@/components/DashboardShell";
import AttendanceCheckForm from "@/components/AttendanceCheckForm";
import { getClassesWithCounts, getRecentAttendanceChecks } from "@/lib/actions/attendance";

export default async function AttendancePage() {
  const [classes, recent] = await Promise.all([
    getClassesWithCounts(),
    getRecentAttendanceChecks(),
  ]);

  return (
    <DashboardShell>
      <h1 className="text-2xl font-bold text-kpa-navy mb-1">Attendance Check</h1>
      <p className="text-sm text-gray-500 mb-6">
        Monday/Tuesday class visit — verify headcount against the register
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {classes.length === 0 ? (
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-sm text-gray-500">
            No classes exist yet.
          </div>
        ) : (
          <AttendanceCheckForm classes={classes as any} />
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-kpa-navy text-sm">Recent Checks</h2>
          </div>
          {recent.map((r: any) => (
            <div key={r.id} className="p-3 text-sm">
              <div className="flex justify-between">
                <p className="font-medium text-kpa-navy">{r.class?.name}</p>
                <span className="text-xs text-gray-400">
                  {new Date(r.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Register: {r.register_count} · Physical: {r.physical_count} ·{" "}
                {r.discrepancy === 0 ? (
                  <span className="text-green-600">Matched</span>
                ) : (
                  <span className="text-red-600">
                    {r.discrepancy > 0 ? "+" : ""}
                    {r.discrepancy} discrepancy
                  </span>
                )}
              </p>
              {r.new_students_found?.length > 0 && (
                <p className="text-xs text-kpa-gold mt-1">
                  {r.new_students_found.length} new child(ren) found — needs enrollment
                </p>
              )}
            </div>
          ))}
          {recent.length === 0 && (
            <p className="p-5 text-sm text-gray-400">No checks recorded yet.</p>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
