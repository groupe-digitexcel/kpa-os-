"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSponsor, type SponsorStatus } from "@/lib/actions/sponsors";

const STATUS_OPTIONS: { value: SponsorStatus; label: string }[] = [
  { value: "identified", label: "Identified" },
  { value: "letter_sent", label: "Letter Sent" },
  { value: "follow_up", label: "Following Up" },
  { value: "committed", label: "Committed" },
  { value: "received", label: "Received" },
  { value: "declined", label: "Declined" },
];

const STATUS_COLORS: Record<string, string> = {
  identified: "bg-gray-100 text-gray-600",
  letter_sent: "bg-blue-100 text-blue-700",
  follow_up: "bg-yellow-100 text-yellow-700",
  committed: "bg-purple-100 text-purple-700",
  received: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-600",
};

export default function SponsorPipeline({ sponsors }: { sponsors: any[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nextFollowUp, setNextFollowUp] = useState("");
  const [amountReceived, setAmountReceived] = useState("");

  function handleStatusChange(id: string, status: SponsorStatus) {
    startTransition(async () => {
      const updates: any = { id, status };
      if (status === "letter_sent") updates.letterSentDate = new Date().toISOString().slice(0, 10);
      if (status === "follow_up") updates.lastFollowUpDate = new Date().toISOString().slice(0, 10);
      await updateSponsor(updates);
      router.refresh();
    });
  }

  function handleSaveFollowUp(id: string) {
    startTransition(async () => {
      await updateSponsor({
        id,
        nextFollowUpDate: nextFollowUp || undefined,
        amountReceived: amountReceived ? Number(amountReceived) : undefined,
      });
      setEditingId(null);
      router.refresh();
    });
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y">
      {sponsors.map((s) => (
        <div key={s.id} className="p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="font-medium text-kpa-navy">{s.organization_name}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[s.status]}`}>
              {STATUS_OPTIONS.find((o) => o.value === s.status)?.label}
            </span>
          </div>
          <p className="text-xs text-gray-500">{s.purpose}</p>
          {s.contact_name && <p className="text-xs text-gray-400">{s.contact_name} · {s.contact_phone}</p>}
          {s.amount_requested && (
            <p className="text-xs text-gray-400 mt-1">
              Requested: {Number(s.amount_requested).toLocaleString()} XAF
              {s.amount_received > 0 && ` · Received: ${Number(s.amount_received).toLocaleString()} XAF`}
            </p>
          )}
          {s.next_follow_up_date && (
            <p className="text-xs text-kpa-gold mt-1">Next follow-up: {s.next_follow_up_date}</p>
          )}

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <select
              value={s.status}
              onChange={(e) => handleStatusChange(s.id, e.target.value as SponsorStatus)}
              disabled={isPending}
              className="text-xs border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
            >
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            {editingId === s.id ? (
              <>
                <input type="date" value={nextFollowUp} onChange={(e) => setNextFollowUp(e.target.value)} className="text-xs border border-gray-300 rounded-lg px-2 py-1" />
                <input type="number" placeholder="Amount received" value={amountReceived} onChange={(e) => setAmountReceived(e.target.value)} className="text-xs border border-gray-300 rounded-lg px-2 py-1 w-28" />
                <button onClick={() => handleSaveFollowUp(s.id)} className="text-xs bg-kpa-navy text-white px-3 py-1 rounded-lg">Save</button>
              </>
            ) : (
              <button onClick={() => setEditingId(s.id)} className="text-xs text-kpa-navy underline">
                Set follow-up / amount
              </button>
            )}
          </div>
        </div>
      ))}
      {sponsors.length === 0 && <p className="p-5 text-sm text-gray-400">No sponsors tracked yet.</p>}
    </div>
  );
}
