"use client";

import { useEffect, useState } from "react";
import { triggerSync, getSyncStatus } from "@/lib/db/sync";
import { retryPendingSms } from "@/lib/actions/sms";
import { maybeAutoBackup } from "@/lib/actions/backup";

export default function SyncStatusBadge() {
  const [status, setStatus] = useState<{
    pendingChanges: number;
    unresolvedConflicts: number;
    lastSyncedAt: string | null;
  } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  async function runSync() {
    setSyncing(true);
    try {
      await triggerSync();
      await retryPendingSms();
      await maybeAutoBackup();
    } catch {
      // stays offline-safe: a failed sync attempt just tries again next cycle
    }
    const s = await getSyncStatus();
    setStatus(s);
    setSyncing(false);
  }

  useEffect(() => {
    setIsOnline(navigator.onLine);
    runSync();

    const interval = setInterval(runSync, 30_000);
    const handleOnline = () => {
      setIsOnline(true);
      runSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!status) return null;

  const hasIssues = status.unresolvedConflicts > 0;

  return (
    <div className="text-xs">
      <div className="flex items-center gap-1.5">
        <span
          className={`w-2 h-2 rounded-full ${
            !isOnline ? "bg-gray-400" : hasIssues ? "bg-red-400" : syncing ? "bg-kpa-gold animate-pulse" : "bg-green-400"
          }`}
        />
        <span className="text-white/70">
          {!isOnline
            ? "Offline — saving locally"
            : syncing
            ? "Syncing..."
            : status.pendingChanges > 0
            ? `${status.pendingChanges} change(s) syncing`
            : "All synced"}
        </span>
      </div>
      {hasIssues && (
        <a
          href="/dashboard/director/sync-conflicts"
          className="text-red-300 underline block mt-1"
        >
          {status.unresolvedConflicts} conflict(s) need review
        </a>
      )}
    </div>
  );
}
