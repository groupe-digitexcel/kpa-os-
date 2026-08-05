import DashboardShell from "@/components/DashboardShell";
import IncidentForm from "@/components/IncidentForm";
import { listIncidents } from "@/lib/actions/health";

const SEVERITY_COLORS: Record<string, string> = {
  minor: "bg-yellow-100 text-yellow-700",
  moderate: "bg-orange-100 text-orange-700",
  serious: "bg-red-100 text-red-700",
};

export default async function IncidentsPage() {
  const incidents = await listIncidents();

  return (
    <DashboardShell>
      <h1 className="text-2xl font-bold text-kpa-navy mb-1">Incidents</h1>
      <p className="text-sm text-gray-500 mb-6">Behavior, injury, and safeguarding reports</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <IncidentForm />

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y max-h-[600px] overflow-y-auto">
          {(incidents as any[]).map((i) => (
            <div key={i.id} className="p-4 text-sm">
              <div className="flex justify-between items-start mb-1">
                <p className="font-medium text-kpa-navy">{i.student?.full_name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${SEVERITY_COLORS[i.severity]}`}>
                  {i.severity}
                </span>
              </div>
              <p className="text-xs text-gray-500 capitalize mb-1">{i.category}</p>
              <p className="text-gray-600">{i.description}</p>
              {i.action_taken && <p className="text-xs text-gray-400 mt-1">Action: {i.action_taken}</p>}
              <p className="text-xs text-gray-400 mt-1">
                Reported by {i.staff?.full_name} · {new Date(i.created_at).toLocaleDateString()}
                {i.parent_notified ? " · Parent notified" : ""}
              </p>
            </div>
          ))}
          {incidents.length === 0 && <p className="p-5 text-sm text-gray-400">No incidents reported.</p>}
        </div>
      </div>
    </DashboardShell>
  );
}
