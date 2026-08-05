"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveReconciliation } from "@/lib/actions/reconciliation";

export default function ReconciliationApproval({ reconciliationId }: { reconciliationId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handle(approve: boolean) {
    startTransition(async () => {
      await approveReconciliation(reconciliationId, approve);
      router.refresh();
    });
  }

  return (
    <div className="flex gap-2">
      <button
        disabled={isPending}
        onClick={() => handle(true)}
        className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50"
      >
        Approve
      </button>
      <button
        disabled={isPending}
        onClick={() => handle(false)}
        className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 disabled:opacity-50"
      >
        Flag
      </button>
    </div>
  );
}
