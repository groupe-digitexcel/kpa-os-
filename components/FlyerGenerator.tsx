"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { draftFlyer } from "@/lib/actions/documents";

export default function FlyerGenerator() {
  const router = useRouter();
  const [occasion, setOccasion] = useState("");
  const [details, setDetails] = useState("");
  const [copy, setCopy] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDraft() {
    setError(null);
    if (!occasion.trim()) {
      setError("Describe the occasion first (e.g. new enrollment season, Xmas concert).");
      return;
    }
    startTransition(async () => {
      const result = await draftFlyer(occasion, details);
      if (result.error) return setError(result.error);
      setCopy(result.copy ?? "");
    });
  }

  function handlePreview() {
    if (!copy.trim()) {
      setError("Draft or write the flyer copy first.");
      return;
    }
    const params = new URLSearchParams({ occasion, copy });
    router.push(`/dashboard/secretary/documents/flyer?${params.toString()}`);
  }

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <h2 className="font-semibold text-kpa-navy text-sm mb-4">Flyer</h2>

      {error && <div className="bg-red-50 text-red-600 text-sm p-2 rounded mb-4">{error}</div>}

      <label className="block text-sm font-medium text-kpa-navy mb-1">Occasion</label>
      <input
        value={occasion}
        onChange={(e) => setOccasion(e.target.value)}
        placeholder="e.g. 2026-2027 Enrollment Open"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
      />

      <label className="block text-sm font-medium text-kpa-navy mb-1">Details</label>
      <textarea
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        rows={2}
        placeholder="e.g. Nursery + Primary, bilingual, PK17 Douala, contact 6XX XXX XXX"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
      />

      <button
        type="button"
        onClick={handleDraft}
        disabled={isPending}
        className="w-full bg-kpa-gold text-kpa-navy font-semibold py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50 mb-4"
      >
        {isPending ? "Drafting..." : "AI Draft Copy"}
      </button>

      <label className="block text-sm font-medium text-kpa-navy mb-1">Flyer Copy</label>
      <textarea
        value={copy}
        onChange={(e) => setCopy(e.target.value)}
        rows={4}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
      />

      <button
        type="button"
        onClick={handlePreview}
        className="w-full bg-kpa-navy text-white font-semibold py-2.5 rounded-lg hover:bg-kpa-navy/90"
      >
        Preview Flyer
      </button>
    </div>
  );
}
