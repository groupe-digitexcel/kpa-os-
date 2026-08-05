"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upsertFeeStructure, applyFeeStructureToLevel } from "@/lib/actions/feeStructure";

const LEVELS = [
  "Nursery 1", "Nursery 2",
  "SIL / CI", "CP", "CE1", "CE2", "CM1", "CM2",
  "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6",
];

export default function FeeStructureManager({ existing }: { existing: any[] }) {
  const router = useRouter();
  const [level, setLevel] = useState(LEVELS[0]);
  const [schoolFee, setSchoolFee] = useState("");
  const [examFee, setExamFee] = useState("");
  const [xmasFee, setXmasFee] = useState("");
  const [endOfYearFee, setEndOfYearFee] = useState("");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function loadLevel(l: string) {
    setLevel(l);
    const found = existing.find((e) => e.level === l);
    setSchoolFee(found ? String(found.school_fee) : "");
    setExamFee(found ? String(found.exam_fee) : "");
    setXmasFee(found ? String(found.xmas_party_fee) : "");
    setEndOfYearFee(found ? String(found.end_of_year_fee) : "");
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await upsertFeeStructure({
        level,
        schoolFee: Number(schoolFee) || 0,
        examFee: Number(examFee) || 0,
        xmasPartyFee: Number(xmasFee) || 0,
        endOfYearFee: Number(endOfYearFee) || 0,
      });
      if (result.error) return setMessage(result.error);
      setMessage("Saved.");
      router.refresh();
    });
  }

  function handleApply() {
    setMessage(null);
    startTransition(async () => {
      const result = await applyFeeStructureToLevel(level);
      if (result.error) return setMessage(result.error);
      setMessage(`Applied to ${result.updatedCount} student(s) who haven't paid yet.`);
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <form onSubmit={handleSave} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h2 className="font-semibold text-kpa-navy text-sm mb-4">Set Fees for a Level</h2>

        {message && <div className="bg-kpa-cream text-kpa-navy text-sm p-2 rounded mb-4">{message}</div>}

        <label className="block text-sm font-medium text-kpa-navy mb-1">Level</label>
        <select
          value={level}
          onChange={(e) => loadLevel(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
        >
          {LEVELS.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>

        <label className="block text-sm font-medium text-kpa-navy mb-1">School Fee (XAF)</label>
        <input
          type="number"
          value={schoolFee}
          onChange={(e) => setSchoolFee(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
        />

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-kpa-navy mb-1">Exam Fee</label>
            <input
              type="number"
              value={examFee}
              onChange={(e) => setExamFee(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-kpa-gold"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-kpa-navy mb-1">Xmas Party</label>
            <input
              type="number"
              value={xmasFee}
              onChange={(e) => setXmasFee(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-kpa-gold"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-kpa-navy mb-1">End of Year</label>
            <input
              type="number"
              value={endOfYearFee}
              onChange={(e) => setEndOfYearFee(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-kpa-gold"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-kpa-navy text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-kpa-navy/90 disabled:opacity-50 mb-3"
        >
          {isPending ? "Saving..." : "Save Fee Structure"}
        </button>

        <button
          type="button"
          onClick={handleApply}
          disabled={isPending}
          className="w-full bg-kpa-gold text-kpa-navy text-sm font-semibold py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          Apply to Unpaid Students in This Level
        </button>
        <p className="text-xs text-gray-400 mt-2">
          Sets the school fee balance for every active student at this level who
          hasn't made a school fee payment yet. Won't touch students already paying.
        </p>
      </form>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-kpa-navy text-sm">Current Fee Structure</h2>
        </div>
        {existing.map((f: any) => (
          <div key={f.id} className="p-3 flex justify-between text-sm">
            <span className="text-kpa-navy font-medium">{f.level}</span>
            <span className="text-gray-500">{Number(f.school_fee).toLocaleString()} XAF</span>
          </div>
        ))}
        {existing.length === 0 && <p className="p-5 text-sm text-gray-400">No fee structure set yet.</p>}
      </div>
    </div>
  );
}
