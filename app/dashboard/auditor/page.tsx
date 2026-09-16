import DashboardShell from "@/components/DashboardShell";
import ExportCsvButton from "@/components/ExportCsvButton";
import BilingualText from "@/components/BilingualText";
import { getAuditLog } from "@/lib/actions/dashboard";
import { exportAuditLogCsv } from "@/lib/actions/exports";

const ACTION_COLORS: Record<string, string> = {
  uniform_resale_flagged: "text-red-600 bg-red-50",
  reconciliation_flagged: "text-red-600 bg-red-50",
  reconciliation_approved: "text-green-600 bg-green-50",
  payment_collected: "text-kpa-navy bg-kpa-cream",
};

export default async function AuditorPage() {
  const logs = await getAuditLog(200);

  return (
    <DashboardShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-kpa-navy mb-1">
          <BilingualText fr="Espace Auditeur" en="Auditor Workspace" />
        </h1>
        <p className="text-sm text-gray-500">
          <BilingualText
            fr="Consultation des opérations sensibles et de la traçabilité du système."
            en="Review sensitive operations and system audit trails."
          />
        </p>
      </div>

      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-gray-500">
          <BilingualText fr="200 dernières activités" en="Latest 200 activities" />
        </p>
        <ExportCsvButton label="Export CSV" fetchCsv={exportAuditLogCsv} filename="audit-log.csv" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y">
        {(logs ?? []).map((l: any) => (
          <div key={l.id} className="p-3 flex items-center justify-between text-sm">
            <div>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ACTION_COLORS[l.action] ?? "text-gray-600 bg-gray-100"}`}>
                {l.action.replace(/_/g, " ")}
              </span>
              <p className="text-xs text-gray-400 mt-1">{l.staff?.full_name ?? "System"}</p>
            </div>
            <span className="text-xs text-gray-400">{new Date(l.created_at).toLocaleString()}</span>
          </div>
        ))}
        {(!logs || logs.length === 0) && (
          <p className="p-5 text-sm text-gray-400">
            <BilingualText fr="Aucune activité enregistrée pour le moment." en="No activity logged yet." />
          </p>
        )}
      </div>
    </DashboardShell>
  );
}
