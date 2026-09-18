import DashboardShell from "@/components/DashboardShell";
import BilingualText from "@/components/BilingualText";
import { PaymentTrendChart, AttendanceTrendChart, EnrollmentChart } from "@/components/AnalyticsCharts";
import { getPaymentTrend, getAttendanceTrend, getEnrollmentByClass } from "@/lib/actions/analytics";

export default async function AnalyticsPage() {
  const [payments, attendance, enrollment] = await Promise.all([
    getPaymentTrend(),
    getAttendanceTrend(),
    getEnrollmentByClass(),
  ]);

  const totalCollected30d = payments.reduce((s, p) => s + p.total, 0);
  const avgAttendance = (() => {
    const valid = attendance.filter((a) => a.pct !== null) as { pct: number }[];
    return valid.length > 0 ? Math.round(valid.reduce((s, a) => s + a.pct, 0) / valid.length) : null;
  })();

  return (
    <DashboardShell>
      <h1 className="text-2xl font-bold text-kpa-navy mb-1"><BilingualText fr="Analyses" en="Analytics" /></h1>
      <p className="text-sm text-gray-500 mb-6"><BilingualText fr="30 derniers jours" en="Last 30 days" /></p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 uppercase"><BilingualText fr="Total encaissé (30 jours)" en="Collected (30 days)" /></p>
          <p className="text-2xl font-bold text-kpa-navy mt-1">{totalCollected30d.toLocaleString()} XAF</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 uppercase"><BilingualText fr="Présence quotidienne moyenne" en="Avg. Daily Attendance" /></p>
          <p className="text-2xl font-bold text-kpa-navy mt-1">{avgAttendance !== null ? `${avgAttendance}%` : "—"}</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-kpa-navy text-sm mb-2"><BilingualText fr="Encaissements quotidiens" en="Daily Collections" /></h2>
          <PaymentTrendChart data={payments} />
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-kpa-navy text-sm mb-2"><BilingualText fr="Taux de présence" en="Attendance Rate" /></h2>
          <AttendanceTrendChart data={attendance} />
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-kpa-navy text-sm mb-2"><BilingualText fr="Effectifs par classe" en="Enrollment by Class" /></h2>
          <EnrollmentChart data={enrollment as any} />
        </div>
      </div>
    </DashboardShell>
  );
}
