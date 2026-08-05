import DashboardShell from "@/components/DashboardShell";
import ConflictResolver from "@/components/ConflictResolver";
import { getUnresolvedConflicts } from "@/lib/db/sync";

export default async function SyncConflictsPage() {
  const conflicts = await getUnresolvedConflicts();

  return (
    <DashboardShell>
      <h1 className="text-2xl font-bold text-kpa-navy mb-1">Sync Conflicts</h1>
      <p className="text-sm text-gray-500 mb-6">
        Two devices changed the same record while offline. Review each and choose which
        version to keep — nothing is deleted automatically, especially for money records.
      </p>

      <div className="space-y-4">
        {(conflicts as any[]).map((c) => (
          <ConflictResolver key={c.id} conflict={c} />
        ))}
        {conflicts.length === 0 && (
          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center text-sm text-gray-400">
            No conflicts. Everything is in sync.
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
