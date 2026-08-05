import DashboardShell from "@/components/DashboardShell";
import PaymentForm from "@/components/PaymentForm";
import ExportCsvButton from "@/components/ExportCsvButton";
import { getRecentPayments } from "@/lib/actions/payments";
import { exportPaymentsCsv } from "@/lib/actions/exports";
import Link from "next/link";

export default async function PaymentsPage() {
  const recent = await getRecentPayments(15);

  return (
    <DashboardShell>
      <h1 className="text-2xl font-bold text-kpa-navy mb-1">Payments / Bursar</h1>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500">Collect a payment and issue a receipt</p>
        <ExportCsvButton label="Export CSV" fetchCsv={exportPaymentsCsv} filename="payments.csv" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PaymentForm />

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-kpa-navy text-sm">Recent Payments</h2>
          </div>
          <div className="divide-y max-h-[520px] overflow-y-auto">
            {recent.length === 0 && (
              <p className="p-4 text-sm text-gray-400">No payments recorded yet today.</p>
            )}
            {recent.map((p: any) => (
              <Link
                key={p.id}
                href={`/dashboard/secretary/payments/receipt/${p.receipt_number}`}
                className="flex items-center justify-between px-4 py-3 text-sm hover:bg-kpa-cream"
              >
                <div>
                  <p className="font-medium text-kpa-navy">{p.student?.full_name}</p>
                  <p className="text-xs text-gray-500">
                    {p.receipt_number} · {p.method.replace("_", " ")}
                  </p>
                </div>
                <span className="font-semibold text-kpa-navy">
                  {Number(p.amount).toLocaleString()} XAF
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
