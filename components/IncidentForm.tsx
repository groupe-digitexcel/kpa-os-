"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createIncident } from "@/lib/actions/health";
import { searchStudents } from "@/lib/actions/payments";
import BilingualText from "@/components/BilingualText";

export default function IncidentForm() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [severity, setSeverity] = useState<"minor" | "moderate" | "serious">("minor");
  const [category, setCategory] = useState("behavior");
  const [description, setDescription] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [parentNotified, setParentNotified] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSearch(v: string) {
    setQuery(v);
    setSelected(null);
    if (v.trim().length < 2) return setResults([]);
    setResults(await searchStudents(v));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!selected || !description.trim()) {
      setError("Select a student and describe what happened.");
      return;
    }
    startTransition(async () => {
      const result = await createIncident({ studentId: selected.id, severity, category, description, actionTaken: actionTaken || undefined, parentNotified });
      if (result.error) return setError(result.error);
      setSuccess("Incident recorded.");
      setDescription("");
      setActionTaken("");
      setParentNotified(false);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <h2 className="font-semibold text-kpa-navy text-sm mb-4"><BilingualText fr="Signaler un incident" en="Report an Incident" /></h2>
      {error && <div className="bg-red-50 text-red-600 text-sm p-2 rounded mb-4"><BilingualText fr="Sélectionnez un élève et décrivez ce qui s’est passé." en="Select a student and describe what happened." /></div>}
      {success && <div className="bg-green-50 text-green-700 text-sm p-2 rounded mb-4"><BilingualText fr="Incident enregistré." en="Incident recorded." /></div>}

      <div className="relative mb-4">
        <input value={query} onChange={(e) => handleSearch(e.target.value)} placeholder="Type student name..." className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-kpa-gold" autoComplete="off" />
        {results.length > 0 && <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">{results.map((s) => <button key={s.id} type="button" onClick={() => { setSelected(s); setQuery(s.full_name); setResults([]); }} className="w-full text-left px-3 py-2 hover:bg-kpa-cream text-sm">{s.full_name}</button>)}</div>}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-kpa-navy mb-1"><BilingualText fr="Gravité" en="Severity" /></label>
          <select value={severity} onChange={(e) => setSeverity(e.target.value as any)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-kpa-gold">
            <option value="minor">Minor / Mineur</option>
            <option value="moderate">Moderate / Modéré</option>
            <option value="serious">Serious / Sérieux</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-kpa-navy mb-1"><BilingualText fr="Catégorie" en="Category" /></label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-kpa-gold">
            <option value="behavior">Behavior / Comportement</option>
            <option value="injury">Injury / Blessure</option>
            <option value="safeguarding">Safeguarding / Protection</option>
            <option value="attendance">Attendance / Présence</option>
            <option value="other">Other / Autre</option>
          </select>
        </div>
      </div>

      <label className="block text-sm font-medium text-kpa-navy mb-1"><BilingualText fr="Que s’est-il passé ?" en="What happened?" /></label>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold" />

      <label className="block text-sm font-medium text-kpa-navy mb-1"><BilingualText fr="Action prise" en="Action Taken" /></label>
      <textarea value={actionTaken} onChange={(e) => setActionTaken(e.target.value)} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold" />

      <label className="flex items-center gap-2 mb-6 text-sm">
        <input type="checkbox" checked={parentNotified} onChange={(e) => setParentNotified(e.target.checked)} className="w-4 h-4" />
        <BilingualText fr="Le parent a été informé" en="Parent has been notified" />
      </label>

      <button type="submit" disabled={isPending} className="w-full bg-kpa-navy text-white font-semibold py-2.5 rounded-lg hover:bg-kpa-navy/90 disabled:opacity-50">
        {isPending ? <BilingualText fr="Envoi..." en="Submitting..." /> : <BilingualText fr="Envoyer le rapport" en="Submit Report" />}
      </button>
    </form>
  );
}
