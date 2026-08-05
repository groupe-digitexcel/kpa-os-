"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { resolveConflict } from "@/lib/db/sync";

export default function ConflictResolver({ conflict }: { conflict: any }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const local = JSON.parse(conflict.local_payload);
  const remote = JSON.parse(conflict.remote_payload || "{}");

  function resolve(choice: "kept_local" | "kept_remote") {
    startTransition(async () => {
      await resolveConflict(conflict.id, choice);
      router.refresh();
    });
  }

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-red-200">
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold text-kpa-navy text-sm capitalize">
          {conflict.table_name.replace("_", " ")}
        </p>
        <span className="text-xs text-gray-400">
          {new Date(conflict.created_at).toLocaleString()}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-kpa-cream rounded-lg p-3">
          <p className="text-xs text-gray-500 uppercase mb-1">This Computer (Local)</p>
          <pre className="text-xs text-kpa-navy whitespace-pre-wrap break-words">
            {JSON.stringify(local, null, 2)}
          </pre>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 uppercase mb-1">Cloud (Other Device)</p>
          <pre className="text-xs text-gray-700 whitespace-pre-wrap break-words">
            {JSON.stringify(remote, null, 2)}
          </pre>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          disabled={isPending}
          onClick={() => resolve("kept_local")}
          className="flex-1 bg-kpa-navy text-white text-sm font-semibold py-2 rounded-lg hover:bg-kpa-navy/90 disabled:opacity-50"
        >
          Keep This Computer's Version
        </button>
        <button
          disabled={isPending}
          onClick={() => resolve("kept_remote")}
          className="flex-1 bg-white border border-gray-300 text-kpa-navy text-sm font-semibold py-2 rounded-lg hover:bg-kpa-cream disabled:opacity-50"
        >
          Keep Cloud Version
        </button>
      </div>
    </div>
  );
}
