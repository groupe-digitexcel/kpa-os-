"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createAssessment, getRosterWithGrades, saveGrades, createSubject } from "@/lib/actions/gradebook";
import BilingualText from "@/components/BilingualText";

type Subject = { id: string; name: string };
type Assessment = { id: string; title: string; term: string; max_score: number; subject: { name: string } };

export default function Gradebook({ classId, subjects, assessments }: { classId: string; subjects: Subject[]; assessments: Assessment[] }) {
  const router = useRouter();
  const [selectedAssessment, setSelectedAssessment] = useState(assessments[0]?.id ?? "");
  const [roster, setRoster] = useState<{ id: string; full_name: string; score: number | null }[]>([]);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newSubjectId, setNewSubjectId] = useState(subjects[0]?.id ?? "");
  const [newTitle, setNewTitle] = useState("");
  const [newTerm, setNewTerm] = useState("Term 1 / 1er Trimestre");
  const [newMaxScore, setNewMaxScore] = useState("20");
  const [newSubjectName, setNewSubjectName] = useState("");

  useEffect(() => { if (selectedAssessment) getRosterWithGrades(classId, selectedAssessment).then(setRoster); }, [selectedAssessment, classId]);
  function updateScore(studentId: string, value: string) { setRoster((prev) => prev.map((s) => s.id === studentId ? { ...s, score: value === "" ? null : Number(value) } : s)); setSaved(false); }
  function handleSaveGrades() { const records = roster.filter((s) => s.score !== null).map((s) => ({ studentId: s.id, score: s.score as number })); startTransition(async () => { await saveGrades(selectedAssessment, records); setSaved(true); }); }
  function handleCreateAssessment(e: React.FormEvent) { e.preventDefault(); startTransition(async () => { let subjectId = newSubjectId; if (newSubjectName.trim()) { const result = await createSubject(newSubjectName); if (result.data) subjectId = (result.data as any).id; } const result = await createAssessment({ classId, subjectId, title: newTitle, term: newTerm, maxScore: Number(newMaxScore) }); if (result.data) { setShowNewForm(false); setNewTitle(""); router.refresh(); } }); }
  const currentMaxScore = assessments.find((a) => a.id === selectedAssessment)?.max_score ?? 20;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <label className="text-sm font-medium text-kpa-navy"><BilingualText fr="Évaluation" en="Assessment" /></label>
          <button type="button" onClick={() => setShowNewForm(!showNewForm)} className="text-xs text-kpa-navy font-semibold hover:underline">{showNewForm ? <BilingualText fr="Annuler" en="Cancel" /> : <BilingualText fr="+ Nouvelle évaluation" en="+ New Assessment" />}</button>
        </div>
        {showNewForm ? (
          <form onSubmit={handleCreateAssessment} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <select value={newSubjectId} onChange={(e) => setNewSubjectId(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-kpa-gold">{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
              <input value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} placeholder="Or new subject name / Ou nouveau nom de matière" className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-kpa-gold" />
            </div>
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Title e.g. Continuous Assessment 1 / Titre" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-kpa-gold" />
            <div className="grid grid-cols-2 gap-3">
              <select value={newTerm} onChange={(e) => setNewTerm(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-kpa-gold"><option>Term 1 / 1er Trimestre</option><option>Term 2 / 2ème Trimestre</option><option>Term 3 / 3ème Trimestre</option></select>
              <input type="number" value={newMaxScore} onChange={(e) => setNewMaxScore(e.target.value)} placeholder="Max score / Note maximale" className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-kpa-gold" />
            </div>
            <button type="submit" disabled={isPending} className="w-full bg-kpa-navy text-white text-sm font-semibold py-2 rounded-lg hover:bg-kpa-navy/90 disabled:opacity-50"><BilingualText fr="Créer" en="Create" /></button>
          </form>
        ) : (
          <select value={selectedAssessment} onChange={(e) => setSelectedAssessment(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-kpa-gold">{assessments.map((a) => <option key={a.id} value={a.id}>{a.subject?.name} — {a.title} ({a.term})</option>)}</select>
        )}
      </div>

      {selectedAssessment && !showNewForm && <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-kpa-navy text-sm"><BilingualText fr={`Saisir les notes (sur ${currentMaxScore})`} en={`Enter Scores (out of ${currentMaxScore})`} /></h2>
          <button onClick={handleSaveGrades} disabled={isPending} className="bg-kpa-navy text-white text-sm font-semibold px-4 py-1.5 rounded-lg hover:bg-kpa-navy/90 disabled:opacity-50">{isPending ? <BilingualText fr="Enregistrement..." en="Saving..." /> : saved ? "Saved ✓ / Enregistré ✓" : <BilingualText fr="Enregistrer les notes" en="Save Scores" />}</button>
        </div>
        <div className="divide-y">
          {roster.map((s) => <div key={s.id} className="flex items-center justify-between px-4 py-3 text-sm"><span className="text-kpa-navy font-medium">{s.full_name}</span><input type="number" min="0" max={currentMaxScore} value={s.score ?? ""} onChange={(e) => updateScore(s.id, e.target.value)} className="w-20 border border-gray-300 rounded-lg px-2 py-1 text-center focus:outline-none focus:ring-2 focus:ring-kpa-gold" /></div>)}
          {roster.length === 0 && <p className="p-5 text-sm text-gray-400"><BilingualText fr="Aucun élève dans cette classe." en="No students in this class." /></p>}
        </div>
      </div>}
    </div>
  );
}
