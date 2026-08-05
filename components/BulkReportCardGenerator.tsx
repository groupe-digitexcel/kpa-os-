"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bulkGenerateReportCards } from "@/lib/actions/documents";

type ClassOpt = { id: string; name: string };

export default function BulkReportCardGenerator({ classes }: { classes: ClassOpt[] }) {
  const router = useRouter();
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [termLabel, setTermLabel] = useState("Term 1 / 1er Trimestre");
  const [strengths, setStrengths] = useState("");
  const [areasToImprove, setAreasToImprove] = useState("");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!strengths.trim()) {
      setError("Add at least a general class strengths note.");
      return;
    }

    startTransition(async () => {
      const result = await bulkGenerateReportCards({ classId, termLabel, strengths, areasToImprove });
      if (result.error) return setError(result.error);
      setMessage(`Generated ${result.successCount} of ${result.total} report cards.`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <h2 className="font-semibold text-kpa-navy text-sm mb-4">Bulk Generate — Whole Class</h2>
      <p className="text-xs text-gray-400 mb-4">
        Each student's own grades are pulled in automatically; this note becomes the shared
        starting point for each student's AI-written comment.
      </p>

      {error && <div className="bg-red-50 text-red-600 text-sm p-2 rounded mb-4">{error}</div>}
      {message && <div className="bg-green-50 text-green-700 text-sm p-2 rounded mb-4">{message}</div>}

      <label className="block text-sm font-medium text-kpa-navy mb-1">Class</label>
      <select
        value={classId}
        onChange={(e) => setClassId(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
      >
        {classes.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      <label className="block text-sm font-medium text-kpa-navy mb-1">Term</label>
      <select
        value={termLabel}
        onChange={(e) => setTermLabel(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
      >
        <option>Term 1 / 1er Trimestre</option>
        <option>Term 2 / 2ème Trimestre</option>
        <option>Term 3 / 3ème Trimestre</option>
      </select>

      <label className="block text-sm font-medium text-kpa-navy mb-1">General Class Strengths</label>
      <textarea
        value={strengths}
        onChange={(e) => setStrengths(e.target.value)}
        rows={2}
        placeholder="e.g. attentive and hardworking class this term"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
      />

      <label className="block text-sm font-medium text-kpa-navy mb-1">General Areas to Improve</label>
      <textarea
        value={areasToImprove}
        onChange={(e) => setAreasToImprove(e.target.value)}
        rows={2}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
      />

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-kpa-gold text-kpa-navy font-semibold py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "Generating..." : "Generate for Whole Class"}
      </button>
    </form>
  );
}
