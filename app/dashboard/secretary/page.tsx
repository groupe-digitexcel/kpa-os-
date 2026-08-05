import DashboardShell from "@/components/DashboardShell";
import ClockInOutWidget from "@/components/ClockInOutWidget";
import { getSecretaryTodayStats } from "@/lib/actions/dashboard";
import { getMyTodayAttendance } from "@/lib/actions/staffAttendance";

export default async function SecretaryDashboard() {
  const today = new Date().toISOString().slice(0, 10);
  const { todaysPayments, todaysReconStatus } = await getSecretaryTodayStats();
  const myAttendance = (await getMyTodayAttendance()) as any;

  return (
    <DashboardShell>
      <h1 className="text-2xl font-bold text-kpa-navy mb-1">Secretary / Bursar</h1>
      <p className="text-sm text-gray-500 mb-6">Today, {today}</p>

      <div className="mb-6">
        <ClockInOutWidget clockInTime={myAttendance?.clock_in ?? null} clockOutTime={myAttendance?.clock_out ?? null} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 uppercase">Payments Today</p>
          <p className="text-3xl font-bold text-kpa-navy mt-1">{todaysPayments ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 uppercase">Daily Close-Out</p>
          <p className="text-lg font-semibold text-kpa-navy mt-1">
            {todaysReconStatus ?? "Not started"}
          </p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 uppercase">Reminder</p>
          <p className="text-sm text-gray-600 mt-1">
            Reconcile cash + MoMo before leaving, hand to accountant.
          </p>
        </div>
      </div>

      <p className="text-sm text-gray-400">
        Bursar payment collection, reconciliation form, attendance-check workflow, inventory and
        SMS/document tools are built in the next steps of this project.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <a
          href="/dashboard/secretary/payments"
          className="bg-kpa-navy text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-kpa-navy/90"
        >
          Collect a Payment
        </a>
        <a
          href="/dashboard/secretary/reconciliation"
          className="bg-kpa-gold text-kpa-navy text-sm font-semibold px-4 py-2.5 rounded-lg hover:opacity-90"
        >
          Daily Reconciliation
        </a>
        <a
          href="/dashboard/secretary/students"
          className="bg-white border border-gray-200 text-kpa-navy text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-kpa-cream"
        >
          Students
        </a>
        <a
          href="/dashboard/secretary/attendance"
          className="bg-white border border-gray-200 text-kpa-navy text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-kpa-cream"
        >
          Attendance Check
        </a>
        <a
          href="/dashboard/secretary/inventory"
          className="bg-white border border-gray-200 text-kpa-navy text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-kpa-cream"
        >
          Inventory
        </a>
      </div>
    </DashboardShell>
  );
}
