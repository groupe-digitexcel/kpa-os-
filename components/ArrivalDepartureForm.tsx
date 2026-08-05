"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markArrival, markDeparture } from "@/lib/actions/attendance";
import { searchStudents } from "@/lib/actions/payments";

export default function ArrivalDepartureForm() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [pickedUpBy, setPickedUpBy] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSearch(v: string) {
    setQuery(v);
    setSelected(null);
    if (v.trim().length < 2) return setResults([]);
    setResults(await searchStudents(v));
  }

  function handleArrival() {
    if (!selected) return setError("Select a student first.");
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await markArrival(selected.id, pickedUpBy || undefined);
      if (result.error) return setError(result.error);
      setSuccess(`Arrival logged for ${selected.full_name}.`);
      router.refresh();
    });
  }

  function handleDeparture() {
    if (!selected) return setError("Select a student first.");
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await markDeparture(selected.id, pickedUpBy || undefined);
      if (result.error) return setError(result.error);
      setSuccess(`Departure logged for ${selected.full_name}.`);
      router.refresh();
    });
  }

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <h2 className="font-semibold text-kpa-navy text-sm mb-4">Log Arrival / Departure</h2>

      {error && <div className="bg-red-50 text-red-600 text-sm p-2 rounded mb-4">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 text-sm p-2 rounded mb-4">{success}</div>}

      <div className="relative mb-4">
        <input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Type student name..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
          autoComplete="off"
        />
        {results.length > 0 && (
          <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
            {results.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setSelected(s);
                  setQuery(s.full_name);
                  setResults([]);
                }}
                className="w-full text-left px-3 py-2 hover:bg-kpa-cream text-sm"
              >
                {s.full_name}
              </button>
            ))}
          </div>
        )}
      </div>

      <label className="block text-sm font-medium text-kpa-navy mb-1">
        Dropped off / Picked up by (optional)
      </label>
      <input
        value={pickedUpBy}
        onChange={(e) => setPickedUpBy(e.target.value)}
        placeholder="e.g. Mother, Uncle Jean, School bus"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleArrival}
          disabled={isPending}
          className="flex-1 bg-kpa-navy text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-kpa-navy/90 disabled:opacity-50"
        >
          Log Arrival
        </button>
        <button
          type="button"
          onClick={handleDeparture}
          disabled={isPending}
          className="flex-1 bg-kpa-gold text-kpa-navy text-sm font-semibold py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          Log Departure
        </button>
      </div>
    </div>
  );
}
