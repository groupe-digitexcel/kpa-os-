"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { searchStudents } from "@/lib/actions/payments";

export default function HealthStudentPicker() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);

  async function handleSearch(v: string) {
    setQuery(v);
    if (v.trim().length < 2) return setResults([]);
    setResults(await searchStudents(v));
  }

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-6">
      <label className="block text-sm font-medium text-kpa-navy mb-1">Find a Student</label>
      <div className="relative">
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
                  setResults([]);
                  setQuery(s.full_name);
                  router.push(`/dashboard/secretary/health?studentId=${s.id}`);
                }}
                className="w-full text-left px-3 py-2 hover:bg-kpa-cream text-sm"
              >
                {s.full_name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
