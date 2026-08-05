import DashboardShell from "@/components/DashboardShell";
import ClockInOutWidget from "@/components/ClockInOutWidget";
import { getDirectorOverviewStats } from "@/lib/actions/dashboard";
import { getMyTodayAttendance } from "@/lib/actions/staffAttendance";

export default async function DirectorDashboard() {
  const { totalStudents, unpaidCount } = await getDirectorOverviewStats();
  const myAttendance = (await getMyTodayAttendance()) as any;

  const paidPct =
    totalStudents > 0 ? Math.round(((totalStudents - unpaidCount) / totalStudents) * 100) : 0;

  return (
    <DashboardShell>
      <h1 className="text-2xl font-bold text-kpa-navy mb-1">Director Overview</h1>
      <p className="text-sm text-gray-500 mb-4">Kingdom Passion Academy — 2026-2027</p>

      <div className="mb-6">
        <ClockInOutWidget clockInTime={myAttendance?.clock_in ?? null} clockOutTime={myAttendance?.clock_out ?? null} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard label="Active Students" value={totalStudents} />
        <KpiCard label="Fees Regularized" value={`${paidPct}%`} sub="Target: 80% by Dec" />
        <KpiCard label="Students Owing" value={unpaidCount} accent="text-red-600" />
      </div>

      <div className="mt-8 bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <p className="text-sm text-gray-500">
          Bursar cash flow, attendance-check discrepancies, and inventory alerts populate here
          once the Bursar and Attendance modules are connected.
        </p>
      </div>
    </DashboardShell>
  );
}

function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${accent ?? "text-kpa-navy"}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}
