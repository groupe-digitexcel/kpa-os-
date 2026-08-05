"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBackup, restoreBackup } from "@/lib/actions/backup";

type Backup = { filename: string; sizeKb: number; createdAt: string };

export default function BackupManager({ backups, isLocalMode }: { backups: Backup[]; isLocalMode: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  function handleBackup() {
    setMessage(null);
    startTransition(async () => {
      const result = await createBackup();
      if (result.error) return setMessage(result.error);
      setMessage(`Backup created: ${result.filename}`);
      router.refresh();
    });
  }

  function handleRestore(filename: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await restoreBackup(filename);
      if (result.error) return setMessage(result.error);
      setMessage("Restored. Please close and reopen the app for the change to take effect.");
      setConfirming(null);
    });
  }

  if (!isLocalMode) {
    return (
      <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center text-sm text-gray-400">
        Backups apply to the Windows desktop app's local database. The web/cloud
        version is backed up automatically by Supabase.
      </div>
    );
  }

  return (
    <div>
      {message && <div className="bg-kpa-cream text-kpa-navy text-sm p-3 rounded-lg mb-4">{message}</div>}

      <button
        onClick={handleBackup}
        disabled={isPending}
        className="bg-kpa-navy text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-kpa-navy/90 disabled:opacity-50 mb-6"
      >
        {isPending ? "Working..." : "Create Backup Now"}
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y">
        {backups.map((b) => (
          <div key={b.filename} className="p-4 flex items-center justify-between text-sm">
            <div>
              <p className="font-medium text-kpa-navy">{new Date(b.createdAt).toLocaleString()}</p>
              <p className="text-xs text-gray-500">{b.sizeKb.toLocaleString()} KB</p>
            </div>
            {confirming === b.filename ? (
              <div className="flex gap-2">
                <button
                  onClick={() => handleRestore(b.filename)}
                  disabled={isPending}
                  className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg"
                >
                  Confirm Restore
                </button>
                <button onClick={() => setConfirming(null)} className="text-xs text-gray-500 px-2">
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirming(b.filename)}
                className="text-xs text-kpa-navy underline"
              >
                Restore this backup
              </button>
            )}
          </div>
        ))}
        {backups.length === 0 && <p className="p-5 text-sm text-gray-400">No backups yet.</p>}
      </div>
    </div>
  );
}
