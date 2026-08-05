"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createIdCard, createCertificate } from "@/lib/actions/documents";

type StudentOpt = { id: string; full_name: string; class: { name: string } | null };

export default function IdAndCertGenerator({ students }: { students: StudentOpt[] }) {
  const router = useRouter();
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [certType, setCertType] = useState<"attestation" | "certificate">("attestation");
  const [occasion, setOccasion] = useState("End of Year / Fin d'Année");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleIdCard() {
    setError(null);
    startTransition(async () => {
      const result = await createIdCard(studentId);
      if (result.error) return setError(result.error);
      router.push(`/dashboard/secretary/documents/id-card/${result.data.id}`);
    });
  }

  function handleCertificate() {
    setError(null);
    startTransition(async () => {
      const result = await createCertificate({ studentId, certType, occasion });
      if (result.error) return setError(result.error);
      router.push(`/dashboard/secretary/documents/certificate/${result.data.id}`);
    });
  }

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <h2 className="font-semibold text-kpa-navy text-sm mb-4">ID Card / Certificate / Attestation</h2>

      {error && <div className="bg-red-50 text-red-600 text-sm p-2 rounded mb-4">{error}</div>}

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

      <button
        type="button"
        onClick={handleIdCard}
        disabled={isPending}
        className="w-full bg-kpa-navy text-white font-semibold py-2.5 rounded-lg hover:bg-kpa-navy/90 disabled:opacity-50 mb-4"
      >
        Generate ID Card / Badge
      </button>

      <div className="border-t border-gray-100 pt-4">
        <div className="grid grid-cols-2 gap-4 mb-3">
          <select
            value={certType}
            onChange={(e) => setCertType(e.target.value as any)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
          >
            <option value="attestation">Attestation</option>
            <option value="certificate">Certificate</option>
          </select>
          <input
            value={occasion}
            onChange={(e) => setOccasion(e.target.value)}
            placeholder="Occasion"
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
          />
        </div>
        <button
          type="button"
          onClick={handleCertificate}
          disabled={isPending}
          className="w-full bg-kpa-gold text-kpa-navy font-semibold py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          Generate {certType === "attestation" ? "Attestation" : "Certificate"}
        </button>
      </div>
    </div>
  );
}
