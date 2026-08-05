import { redirect } from "next/navigation";
import { getParentSessionData, parentLogout } from "@/lib/actions/parentPortal";
import { PayFeesButton } from "@/components/parent-portal/PayFeesButton";

export default async function ParentDashboard() {
  const data = await getParentSessionData();
  if (!data) redirect("/parent-portal");

  const children = data.children ?? [];

  return (
    <main className="min-h-screen bg-kpa-cream p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-kpa-navy">Kingdom Passion Academy</h1>
            <p className="text-sm text-gray-500">Welcome, {data.parent?.full_name}</p>
          </div>
          <form action={async () => { "use server"; await parentLogout(); redirect("/parent-portal"); }}>
            <button type="submit" className="text-xs text-gray-500 underline">
              Sign out
            </button>
          </form>
        </div>

        <div className="space-y-6">
          {children.map((child: any) => (
            <div key={child.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-kpa-navy text-white p-4">
                <p className="font-bold text-kpa-gold">{child.full_name}</p>
                <p className="text-xs text-white/70">{child.class_name}</p>
              </div>

              <div className="p-4 border-b border-gray-100">
                <p className="text-xs text-gray-500 uppercase mb-1">Fee Balance</p>
                <p className={`text-2xl font-bold ${child.total_fee_due > 0 ? "text-red-600" : "text-green-600"}`}>
                  {Number(child.total_fee_due).toLocaleString()} XAF
                </p>
                <PayFeesButton studentId={child.id} feeBalance={Number(child.total_fee_due)} />
              </div>

              {child.recent_payments?.length > 0 && (
                <div className="p-4 border-b border-gray-100">
                  <p className="text-xs text-gray-500 uppercase mb-2">Recent Payments</p>
                  <div className="space-y-1">
                    {child.recent_payments.slice(0, 5).map((p: any, i: number) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-500">{new Date(p.paid_at).toLocaleDateString()}</span>
                        <span className="text-kpa-navy font-medium">{Number(p.amount).toLocaleString()} XAF</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {child.attendance_last_30_days?.length > 0 && (
                <div className="p-4 border-b border-gray-100">
                  <p className="text-xs text-gray-500 uppercase mb-2">Attendance (last 30 days)</p>
                  <p className="text-sm text-kpa-navy">
                    {child.attendance_last_30_days.filter((a: any) => a.present).length} /{" "}
                    {child.attendance_last_30_days.length} days present
                  </p>
                </div>
              )}

              {child.grades?.length > 0 && (
                <div className="p-4 border-b border-gray-100">
                  <p className="text-xs text-gray-500 uppercase mb-2">Grades</p>
                  <div className="space-y-1">
                    {child.grades.map((g: any, i: number) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-500">{g.subject} — {g.title}</span>
                        <span className="text-kpa-navy font-medium">{g.score}/{g.max_score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {child.report_cards?.length > 0 && (
                <div className="p-4">
                  <p className="text-xs text-gray-500 uppercase mb-2">Report Card Comments</p>
                  <div className="space-y-2">
                    {child.report_cards.map((r: any, i: number) => (
                      <div key={i} className="text-sm">
                        <p className="text-xs text-gray-400">{r.term}</p>
                        <p className="text-gray-600">{r.comment}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          {children.length === 0 && (
            <p className="text-center text-sm text-gray-400">No children linked to this account yet.</p>
          )}
        </div>
      </div>
    </main>
  );
}
