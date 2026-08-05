import DashboardShell from "@/components/DashboardShell";
import ArrivalDepartureForm from "@/components/ArrivalDepartureForm";
import { getTodayArrivalsAndDepartures } from "@/lib/actions/attendance";

export default async function ArrivalsPage() {
  const log = await getTodayArrivalsAndDepartures();

  return (
    <DashboardShell>
      <h1 className="text-2xl font-bold text-kpa-navy mb-1">Arrival / Departure</h1>
      <p className="text-sm text-gray-500 mb-6">{new Date().toLocaleDateString()}</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ArrivalDepartureForm />

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y max-h-[560px] overflow-y-auto">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-kpa-navy text-sm">Today's Log</h2>
          </div>
          {(log as any[]).map((r) => (
            <div key={r.id} className="p-3 text-sm">
              <p className="font-medium text-kpa-navy">{r.student?.full_name}</p>
              <p className="text-xs text-gray-500">
                {r.student?.class?.name} · In:{" "}
                {r.arrival_time ? new Date(r.arrival_time).toLocaleTimeString() : "—"} · Out:{" "}
                {r.departure_time ? new Date(r.departure_time).toLocaleTimeString() : "—"}
              </p>
              {r.picked_up_by && <p className="text-xs text-gray-400">By: {r.picked_up_by}</p>}
            </div>
          ))}
          {log.length === 0 && <p className="p-5 text-sm text-gray-400">No log entries yet today.</p>}
        </div>
      </div>
    </DashboardShell>
  );
}
