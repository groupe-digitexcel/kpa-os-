"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSchoolSettings, type SchoolSettings } from "@/lib/actions/settings";

export default function SettingsForm({ settings }: { settings: SchoolSettings }) {
  const router = useRouter();
  const [schoolName, setSchoolName] = useState(settings.school_name);
  const [address, setAddress] = useState(settings.address ?? "");
  const [phone, setPhone] = useState(settings.phone ?? "");
  const [email, setEmail] = useState(settings.email ?? "");
  const [academicYear, setAcademicYear] = useState(settings.current_academic_year);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await updateSchoolSettings({
        school_name: schoolName,
        address,
        phone,
        email,
        current_academic_year: academicYear,
      });
      if (result.error) return setMessage(result.error);
      setMessage("Saved.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 max-w-lg">
      {message && <div className="bg-kpa-cream text-kpa-navy text-sm p-2 rounded mb-4">{message}</div>}

      <label className="block text-sm font-medium text-kpa-navy mb-1">School Name</label>
      <input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold" />

      <label className="block text-sm font-medium text-kpa-navy mb-1">Address</label>
      <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold" />

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-kpa-navy mb-1">Phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-kpa-gold" />
        </div>
        <div>
          <label className="block text-sm font-medium text-kpa-navy mb-1">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-kpa-gold" />
        </div>
      </div>

      <label className="block text-sm font-medium text-kpa-navy mb-1">Current Academic Year</label>
      <input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} placeholder="e.g. 2026-2027" className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-kpa-gold" />

      <button type="submit" disabled={isPending} className="w-full bg-kpa-navy text-white font-semibold py-2.5 rounded-lg hover:bg-kpa-navy/90 disabled:opacity-50">
        {isPending ? "Saving..." : "Save Settings"}
      </button>
    </form>
  );
}
