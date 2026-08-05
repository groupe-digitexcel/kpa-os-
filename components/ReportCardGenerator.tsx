"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createReportCard } from "@/lib/actions/documents";

type StudentOpt = { id: string; full_name: string; class: { name: string; level: string } | null };

export default function ReportCardGenerator({ students }: { students: StudentOpt[] }) {
  const router = useRouter();
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [termLabel, setTermLabel] = useState("Term 1 / 1er Trimestre");
  const [strengths, setStrengths] = useState("");
  const [areasToImprove, setAreasToImprove] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNote(null);

    const student = students.find((s) => s.id === studentId);
    if (!student || !strengths.trim()) {
      setError("Select a student and note at least their strengths.");
      return;
    }

    startTransition(async () => {
      const result = await createReportCard({
        studentId,
        studentName: student.full_name,
        level: student.class?.level ?? "",
        termLabel,
        strengths,
        areasToImprove,
      });

      if (result.error) return setError(result.error);

      if (!result.aiAvailable) {
        setNote("AI comment writer isn't configured yet — used your notes directly instead.");
      }

      router.push(`/dashboard/secretary/documents/report-card/${result.data.id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <h2 className="font-semibold text-kpa-navy text-sm mb-4">Generate Report Card</h2>

      {error && <div className="bg-red-50 text-red-600 text-sm p-2 rounded mb-4">{error}</div>}
      {note && <div className="bg-kpa-cream text-kpa-navy text-sm p-2 rounded mb-4">{note}</div>}

      <label className="block text-sm font-medium text-kpa-navy mb-1">Student</label>
      <select
        value={studentId}
        onChange={(e) => setStudentId(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
      >
        {students.map((s) => (
          <option key={s.id} value={s.id}>
            {s.full_name} — {s.class?.name}
          </option>
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

      <label className="block text-sm font-medium text-kpa-navy mb-1">
        Strengths (teacher's notes)
      </label>
      <textarea
        value={strengths}
        onChange={(e) => setStrengths(e.target.value)}
        rows={2}
        placeholder="e.g. very active in class, good at reading, kind to classmates"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
      />

      <label className="block text-sm font-medium text-kpa-navy mb-1">Areas to improve</label>
      <textarea
        value={areasToImprove}
        onChange={(e) => setAreasToImprove(e.target.value)}
        rows={2}
        placeholder="e.g. needs to practice writing, sometimes distracted"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
      />

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-kpa-navy text-white font-semibold py-2.5 rounded-lg hover:bg-kpa-navy/90 disabled:opacity-50"
      >
        {isPending ? "Generating..." : "Generate Report Card"}
      </button>
    </form>
  );
}
