import DashboardShell from "@/components/DashboardShell";
import BackupManager from "@/components/BackupManager";
import { listBackups } from "@/lib/actions/backup";

export default async function BackupsPage() {
  const backups = await listBackups();
  const isLocal = process.env.DATA_MODE === "local";

  return (
    <DashboardShell>
      <h1 className="text-2xl font-bold text-kpa-navy mb-1">Backups</h1>
      <p className="text-sm text-gray-500 mb-6">
        Protects against a laptop being lost, stolen, or damaged. Restoring
        replaces all current data on this computer with the backup's contents.
      </p>

      <BackupManager backups={backups as any} isLocalMode={isLocal} />
    </DashboardShell>
  );
}
