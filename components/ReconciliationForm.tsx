"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitReconciliation } from "@/lib/actions/reconciliation";

export default function ReconciliationForm({
  expectedCash,
  expectedMomo,
  alreadySubmitted,
}: {
  expectedCash: number;
  expectedMomo: number;
  alreadySubmitted: boolean;
}) {
  const router = useRouter();
  const [declaredCash, setDeclaredCash] = useState("");
  const [declaredMomo, setDeclaredMomo] = useState("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const cashVariance = declaredCash ? Number(declaredCash) - expectedCash : null;
  const momoVariance = declaredMomo ? Number(declaredMomo) - expectedMomo : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await submitReconciliation({
        declaredCash: Number(declaredCash || 0),
        declaredMomo: Number(declaredMomo || 0),
        notes: notes || undefined,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      router.refresh();
    });
  }

  if (alreadySubmitted) {
    return (
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-sm text-gray-600">
        Today&apos;s reconciliation has already been submitted and handed to the accountant.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      {error && <div className="bg-red-50 text-red-600 text-sm p-2 rounded mb-4">{error}</div>}

      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div className="bg-kpa-cream rounded-lg p-3">
          <p className="text-gray-500 text-xs uppercase">System-Expected Cash</p>
          <p className="font-bold text-kpa-navy text-lg">{expectedCash.toLocaleString()} XAF</p>
        </div>
        <div className="bg-kpa-cream rounded-lg p-3">
          <p className="text-gray-500 text-xs uppercase">System-Expected MoMo/OM</p>
          <p className="font-bold text-kpa-navy text-lg">{expectedMomo.toLocaleString()} XAF</p>
        </div>
      </div>

      <label className="block text-sm font-medium text-kpa-navy mb-1">
        Cash Physically Counted
      </label>
      <input
        type="number"
        min="0"
        value={declaredCash}
        onChange={(e) => setDeclaredCash(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-1 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
        required
      />
      {cashVariance !== null && cashVariance !== 0 && (
        <p className="text-xs text-red-600 mb-3">
          Variance: {cashVariance > 0 ? "+" : ""}
          {cashVariance.toLocaleString()} XAF
        </p>
      )}
      {cashVariance === 0 && <p className="text-xs text-green-600 mb-3">Matches exactly ✓</p>}

      <label className="block text-sm font-medium text-kpa-navy mb-1 mt-2">
        MoMo/Orange Money Confirmed
      </label>
      <input
        type="number"
        min="0"
        value={declaredMomo}
        onChange={(e) => setDeclaredMomo(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-1 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
        required
      />
      {momoVariance !== null && momoVariance !== 0 && (
        <p className="text-xs text-red-600 mb-3">
          Variance: {momoVariance > 0 ? "+" : ""}
          {momoVariance.toLocaleString()} XAF
        </p>
      )}
      {momoVariance === 0 && <p className="text-xs text-green-600 mb-3">Matches exactly ✓</p>}

      <label className="block text-sm font-medium text-kpa-navy mb-1 mt-4">
        Notes (explain any variance)
      </label>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
      />

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-kpa-navy text-white font-semibold py-2.5 rounded-lg hover:bg-kpa-navy/90 disabled:opacity-50"
      >
        {isPending ? "Submitting..." : "Submit to Accountant"}
      </button>
    </form>
  );
}
