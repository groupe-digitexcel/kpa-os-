"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAdmission } from "@/lib/actions/admissions";

export default function AdmissionInquiryForm() {
  const router = useRouter();
  const [childName, setChildName] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<"M" | "F">("M");
  const [level, setLevel] = useState("");
  const [subsystem, setSubsystem] = useState<"anglophone" | "francophone">("anglophone");
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!childName.trim() || !parentName.trim() || !parentPhone.trim()) {
      setError("Child name, parent name, and phone are required.");
      return;
    }

    startTransition(async () => {
      const result = await createAdmission({
        childFullName: childName,
        age: Number(age) || undefined,
        sex,
        desiredLevel: level || undefined,
        desiredSubsystem: subsystem,
        parentName,
        parentPhone,
        notes: notes || undefined,
      });
      if (result.error) return setError(result.error);
      setSuccess("Inquiry logged.");
      setChildName("");
      setAge("");
      setParentName("");
      setParentPhone("");
      setNotes("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <h2 className="font-semibold text-kpa-navy text-sm mb-4">New Inquiry</h2>

      {error && <div className="bg-red-50 text-red-600 text-sm p-2 rounded mb-4">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 text-sm p-2 rounded mb-4">{success}</div>}

      <label className="block text-sm font-medium text-kpa-navy mb-1">Child's Name</label>
      <input value={childName} onChange={(e) => setChildName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold" />

      <div className="grid grid-cols-3 gap-3 mb-4">
        <input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="Age" className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-kpa-gold" />
        <select value={sex} onChange={(e) => setSex(e.target.value as any)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-kpa-gold">
          <option value="M">M</option>
          <option value="F">F</option>
        </select>
        <select value={subsystem} onChange={(e) => setSubsystem(e.target.value as any)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-kpa-gold">
          <option value="anglophone">Anglo</option>
          <option value="francophone">Franco</option>
        </select>
      </div>

      <label className="block text-sm font-medium text-kpa-navy mb-1">Desired Level</label>
      <input value={level} onChange={(e) => setLevel(e.target.value)} placeholder="e.g. Nursery 2" className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold" />

      <div className="border-t border-gray-100 my-4 pt-4">
        <p className="text-xs text-gray-500 uppercase mb-3">Parent / Guardian</p>
        <label className="block text-sm font-medium text-kpa-navy mb-1">Name</label>
        <input value={parentName} onChange={(e) => setParentName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold" />
        <label className="block text-sm font-medium text-kpa-navy mb-1">Phone</label>
        <input value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-kpa-gold" />
      </div>

      <label className="block text-sm font-medium text-kpa-navy mb-1 mt-4">Notes</label>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-kpa-gold" />

      <button type="submit" disabled={isPending} className="w-full bg-kpa-navy text-white font-semibold py-2.5 rounded-lg hover:bg-kpa-navy/90 disabled:opacity-50">
        {isPending ? "Saving..." : "Log Inquiry"}
      </button>
    </form>
  );
}
