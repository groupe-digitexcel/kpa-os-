"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getClassRosterForPromotion, promoteStudents } from "@/lib/actions/promotion";

type ClassOpt = { id: string; name: string };
type Student = { id: string; full_name: string; total_fee_due: number };

export default function PromotionTool({ classes }: { classes: ClassOpt[] }) {
  const router = useRouter();
  const [sourceClassId, setSourceClassId] = useState(classes[0]?.id ?? "");
  const [roster, setRoster] = useState<Student[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [action, setAction] = useState<"promote" | "graduate" | "drop_out">("promote");
  const [destinationClassId, setDestinationClassId] = useState(classes[1]?.id ?? classes[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (sourceClassId) {
      getClassRosterForPromotion(sourceClassId).then((r) => {
        setRoster(r as any);
        setSelected(new Set((r as any).map((s: Student) => s.id)));
      });
    }
  }, [sourceClassId]);

  function toggle(id: string) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  function handleSubmit() {
    if (selected.size === 0) return setMessage("Select at least one student.");
    if (action === "promote" && !destinationClassId) return setMessage("Choose a destination class.");
    if (action === "promote" && destinationClassId === sourceClassId) {
      return setMessage("Destination must be different from the source class.");
    }

    setMessage(null);
    startTransition(async () => {
      const result = await promoteStudents({
        studentIds: Array.from(selected),
        action,
        destinationClassId: action === "promote" ? destinationClassId : undefined,
      });
      if (result.error) return setMessage(result.error);
      setMessage(`Done — ${result.updatedCount} student(s) updated.`);
      const r = await getClassRosterForPromotion(sourceClassId);
      setRoster(r as any);
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <label className="block text-sm font-medium text-kpa-navy mb-1">From Class</label>
        <select
          value={sourceClassId}
          onChange={(e) => setSourceClassId(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
        >
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {message && <div className="bg-kpa-cream text-kpa-navy text-sm p-3 rounded-lg">{message}</div>}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-kpa-navy text-sm">
            {selected.size} of {roster.length} selected
          </h2>
          <button
            onClick={() => setSelected(selected.size === roster.length ? new Set() : new Set(roster.map((s) => s.id)))}
            className="text-xs text-kpa-navy underline"
          >
            {selected.size === roster.length ? "Deselect all" : "Select all"}
          </button>
        </div>
        <div className="divide-y max-h-80 overflow-y-auto">
          {roster.map((s) => (
            <label key={s.id} className="flex items-center justify-between px-4 py-3 text-sm cursor-pointer hover:bg-kpa-cream">
              <span className="flex items-center gap-3">
                <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} className="w-4 h-4" />
                <span className="text-kpa-navy font-medium">{s.full_name}</span>
              </span>
              {s.total_fee_due > 0 && (
                <span className="text-xs text-red-500">Owes {s.total_fee_due.toLocaleString()} XAF</span>
              )}
            </label>
          ))}
          {roster.length === 0 && <p className="p-5 text-sm text-gray-400">No active students in this class.</p>}
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <label className="block text-sm font-medium text-kpa-navy mb-1">Action</label>
        <select
          value={action}
          onChange={(e) => setAction(e.target.value as any)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
        >
          <option value="promote">Promote to another class</option>
          <option value="graduate">Graduate (finished school)</option>
          <option value="drop_out">Mark as dropped out</option>
        </select>

        {action === "promote" && (
          <>
            <label className="block text-sm font-medium text-kpa-navy mb-1">Destination Class</label>
            <select
              value={destinationClassId}
              onChange={(e) => setDestinationClassId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </>
        )}

        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="w-full bg-kpa-navy text-white font-semibold py-2.5 rounded-lg hover:bg-kpa-navy/90 disabled:opacity-50"
        >
          {isPending ? "Working..." : `Apply to ${selected.size} Student(s)`}
        </button>
      </div>
    </div>
  );
}
