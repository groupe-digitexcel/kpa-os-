"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClass } from "@/lib/actions/classes";
import BilingualText from "@/components/BilingualText";

const LEVELS = ["Nursery 1", "Nursery 2", "SIL / CI", "CP", "CE1", "CE2", "CM1", "CM2", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6"];

export default function ClassForm({ teachers }: { teachers: { id: string; full_name: string }[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [subsystem, setSubsystem] = useState<"anglophone" | "francophone">("anglophone");
  const [level, setLevel] = useState(LEVELS[0]);
  const [teacherId, setTeacherId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Class name is required.");
      return;
    }
    startTransition(async () => {
      const result = await createClass({ name, subsystem, level, teacherId });
      if (result.error) return setError(result.error);
      setName("");
      setTeacherId("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      {error && <div className="bg-red-50 text-red-600 text-sm p-2 rounded mb-4"><BilingualText fr="Le nom de la classe est obligatoire." en="Class name is required." /></div>}

      <label className="block text-sm font-medium text-kpa-navy mb-1"><BilingualText fr="Nom de la classe" en="Class Name" /></label>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Nursery 2A" className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold" />

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-kpa-navy mb-1"><BilingualText fr="Sous-système" en="Subsystem" /></label>
          <select value={subsystem} onChange={(e) => setSubsystem(e.target.value as any)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-kpa-gold">
            <option value="anglophone">Anglophone</option>
            <option value="francophone">Francophone</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-kpa-navy mb-1"><BilingualText fr="Niveau" en="Level" /></label>
          <select value={level} onChange={(e) => setLevel(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-kpa-gold">
            {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>

      <label className="block text-sm font-medium text-kpa-navy mb-1"><BilingualText fr="Affecter un enseignant" en="Assign Teacher" /></label>
      <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-kpa-gold">
        <option value="">— <BilingualText fr="Non affecté" en="Unassigned" /> —</option>
        {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
      </select>

      <button type="submit" disabled={isPending} className="w-full bg-kpa-navy text-white font-semibold py-2.5 rounded-lg hover:bg-kpa-navy/90 disabled:opacity-50">
        {isPending ? <BilingualText fr="Création..." en="Creating..." /> : <BilingualText fr="Créer la classe" en="Create Class" />}
      </button>
    </form>
  );
}
