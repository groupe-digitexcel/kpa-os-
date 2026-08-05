import DashboardShell from "@/components/DashboardShell";
import ReconciliationForm from "@/components/ReconciliationForm";
import { getTodaysExpectedTotals, getTodaysReconciliation } from "@/lib/actions/reconciliation";

export default async function ReconciliationPage() {
  const [expected, existing] = await Promise.all([
    getTodaysExpectedTotals(),
    getTodaysReconciliation(),
  ]);

  return (
    <DashboardShell>
      <h1 className="text-2xl font-bold text-kpa-navy mb-1">Daily Cash Reconciliation</h1>
      <p className="text-sm text-gray-500 mb-6">
        Count all cash and confirm MoMo/Orange Money before handing off to the accountant.
      </p>

      <div className="max-w-lg">
        <ReconciliationForm
          expectedCash={expected.cash}
          expectedMomo={expected.momo}
          alreadySubmitted={!!existing}
        />

        {expected.other > 0 && (
          <div className="mt-4 bg-blue-50 rounded-xl p-4 text-sm text-blue-900">
            ℹ️ <strong>{expected.other.toLocaleString()} XAF</strong> in online payments (parent portal / CamPay)
            today — already confirmed and credited, not part of this cash/MoMo count.
          </div>
        )}

        {existing && (
          <div className="mt-4 bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-sm">
            <p className="text-gray-500">
              Status:{" "}
              <span
                className={
                  existing.status === "approved"
                    ? "text-green-600 font-semibold"
                    : existing.status === "flagged"
                    ? "text-red-600 font-semibold"
                    : "text-kpa-gold font-semibold"
                }
              >
                {existing.status}
              </span>
            </p>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
