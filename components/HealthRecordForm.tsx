"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upsertHealthRecord } from "@/lib/actions/health";

export default function HealthRecordForm({ studentId, existing }: { studentId: string; existing: any }) {
  const router = useRouter();
  const [allergies, setAllergies] = useState(existing?.allergies ?? "");
  const [conditions, setConditions] = useState(existing?.conditions ?? "");
  const [medications, setMedications] = useState(existing?.medications ?? "");
  const [emergencyName, setEmergencyName] = useState(existing?.emergency_contact_name ?? "");
  const [emergencyPhone, setEmergencyPhone] = useState(existing?.emergency_contact_phone ?? "");
  const [bloodType, setBloodType] = useState(existing?.blood_type ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(false);
    startTransition(async () => {
      await upsertHealthRecord({
        studentId,
        allergies,
        conditions,
        medications,
        emergencyContactName: emergencyName,
        emergencyContactPhone: emergencyPhone,
        bloodType,
        notes,
      });
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      {saved && <div className="bg-green-50 text-green-700 text-sm p-2 rounded mb-4">Saved.</div>}

      <label className="block text-sm font-medium text-kpa-navy mb-1">Allergies</label>
      <textarea
        value={allergies}
        onChange={(e) => setAllergies(e.target.value)}
        rows={2}
        placeholder="e.g. peanuts, penicillin"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
      />

      <label className="block text-sm font-medium text-kpa-navy mb-1">Ongoing Conditions</label>
      <textarea
        value={conditions}
        onChange={(e) => setConditions(e.target.value)}
        rows={2}
        placeholder="e.g. asthma, sickle cell"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
      />

      <label className="block text-sm font-medium text-kpa-navy mb-1">Medications</label>
      <input
        value={medications}
        onChange={(e) => setMedications(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
      />

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-kpa-navy mb-1">Emergency Contact</label>
          <input
            value={emergencyName}
            onChange={(e) => setEmergencyName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-kpa-navy mb-1">Emergency Phone</label>
          <input
            value={emergencyPhone}
            onChange={(e) => setEmergencyPhone(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
          />
        </div>
      </div>

      <label className="block text-sm font-medium text-kpa-navy mb-1">Blood Type</label>
      <input
        value={bloodType}
        onChange={(e) => setBloodType(e.target.value)}
        placeholder="e.g. O+"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
      />

      <label className="block text-sm font-medium text-kpa-navy mb-1">Notes</label>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
      />

      <button
        onClick={handleSave}
        disabled={isPending}
        className="w-full bg-kpa-navy text-white font-semibold py-2.5 rounded-lg hover:bg-kpa-navy/90 disabled:opacity-50"
      >
        {isPending ? "Saving..." : "Save Health Record"}
      </button>
    </div>
  );
}
