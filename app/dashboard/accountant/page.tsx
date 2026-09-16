import DashboardShell from "@/components/DashboardShell";
import ReconciliationApproval from "@/components/ReconciliationApproval";
import ClockInOutWidget from "@/components/ClockInOutWidget";
import BilingualText from "@/components/BilingualText";
import { getPendingReconciliations } from "@/lib/actions/dashboard";
import { getMyTodayAttendance } from "@/lib/actions/staffAttendance";

export default async function AccountantDashboard() {
  const pending = await getPendingReconciliations();
  const myAttendance = (await getMyTodayAttendance()) as any;

  return (
    <DashboardShell>
      <h1 className="text-2xl font-bold text-kpa-navy mb-1"><BilingualText fr="Aperçu comptable" en="Accountant Overview" /></h1>
      <p className="text-sm text-gray-500 mb-4"><BilingualText fr="Rapprochements quotidiens en attente d’approbation" en="Daily reconciliations awaiting approval" /></p>

      <div className="mb-6">
        <ClockInOutWidget clockInTime={myAttendance?.clock_in ?? null} clockOutTime={myAttendance?.clock_out ?? null} />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y">
        {(!pending || pending.length === 0) && (
          <p className="p-5 text-sm text-gray-400"><BilingualText fr="Aucun rapprochement en attente. Tout est à jour." en="No pending reconciliations. All caught up." /></p>
        )}
        {pending?.map((r: any) => (
          <div key={r.id} className="p-4 flex items-center justify-between text-sm">
            <div>
              <p className="font-medium text-kpa-navy">{r.reconciliation_date}</p>
              <p className="text-gray-500"><BilingualText fr="Soumis par" en="Submitted by" /> {r.staff?.full_name}</p>
            </div>
            <div className="text-right">
              <p
                className={
                  r.variance_cash !== 0 || r.variance_momo !== 0
                    ? "text-red-600 font-semibold"
                    : "text-green-600"
                }
              >
                <BilingualText fr="Écart" en="Variance" />: {(r.variance_cash + r.variance_momo).toLocaleString()} XAF
              </p>
              <div className="mt-2 flex justify-end">
                <ReconciliationApproval reconciliationId={r.id} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}
