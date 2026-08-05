"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitAttendanceCheck } from "@/lib/actions/attendance";

type NewStudent = { name: string; age: string; sex: "M" | "F" };

export default function AttendanceCheckForm({
  classes,
}: {
  classes: { id: string; name: string; students: { count: number }[] }[];
}) {
  const router = useRouter();
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [physicalCount, setPhysicalCount] = useState("");
  const [newStudents, setNewStudents] = useState<NewStudent[]>([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const registerCount = classes.find((c) => c.id === classId)?.students?.[0]?.count ?? 0;
  const discrepancy = physicalCount ? Number(physicalCount) - registerCount : null;

  function addNewStudentRow() {
    setNewStudents([...newStudents, { name: "", age: "", sex: "M" }]);
  }

  function updateRow(index: number, field: keyof NewStudent, value: string) {
    const updated = [...newStudents];
    updated[index] = { ...updated[index], [field]: value };
    setNewStudents(updated);
  }

  function removeRow(index: number) {
    setNewStudents(newStudents.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!classId || !physicalCount) {
      setError("Select a class and enter the physical headcount.");
      return;
    }

    startTransition(async () => {
      const result = await submitAttendanceCheck({
        classId,
        physicalCount: Number(physicalCount),
        newStudentsFound: newStudents
          .filter((s) => s.name.trim())
          .map((s) => ({ name: s.name, age: Number(s.age) || 0, sex: s.sex })),
        notes: notes || undefined,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setSuccess("Attendance check recorded.");
      setPhysicalCount("");
      setNewStudents([]);
      setNotes("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      {error && <div className="bg-red-50 text-red-600 text-sm p-2 rounded mb-4">{error}</div>}
      {success && (
        <div className="bg-green-50 text-green-700 text-sm p-2 rounded mb-4">{success}</div>
      )}

      <label className="block text-sm font-medium text-kpa-navy mb-1">Class</label>
      <select
        value={classId}
        onChange={(e) => setClassId(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
      >
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} ({c.students?.[0]?.count ?? 0} on register)
          </option>
        ))}
      </select>

      <label className="block text-sm font-medium text-kpa-navy mb-1">
        Physical Headcount (kids actually in class)
      </label>
      <input
        type="number"
        min="0"
        value={physicalCount}
        onChange={(e) => setPhysicalCount(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-1 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
      />
      {discrepancy !== null && discrepancy !== 0 && (
        <p className="text-xs text-red-600 mb-3">
          Discrepancy vs register: {discrepancy > 0 ? "+" : ""}
          {discrepancy}
        </p>
      )}
      {discrepancy === 0 && <p className="text-xs text-green-600 mb-3">Matches register ✓</p>}

      <div className="border-t border-gray-100 my-4 pt-4">
        <div className="flex justify-between items-center mb-2">
          <p className="text-xs text-gray-500 uppercase">New Students Found (not yet enrolled)</p>
          <button
            type="button"
            onClick={addNewStudentRow}
            className="text-xs text-kpa-navy font-semibold hover:underline"
          >
            + Add child
          </button>
        </div>

        {newStudents.map((s, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input
              placeholder="Name"
              value={s.name}
              onChange={(e) => updateRow(i, "name", e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-kpa-gold"
            />
            <input
              placeholder="Age"
              type="number"
              value={s.age}
              onChange={(e) => updateRow(i, "age", e.target.value)}
              className="w-16 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-kpa-gold"
            />
            <select
              value={s.sex}
              onChange={(e) => updateRow(i, "sex", e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-kpa-gold"
            >
              <option value="M">M</option>
              <option value="F">F</option>
            </select>
            <button
              type="button"
              onClick={() => removeRow(i)}
              className="text-red-500 text-sm px-2"
            >
              ✕
            </button>
          </div>
        ))}
        <p className="text-xs text-gray-400">
          These are flagged for the Secretary to formally enroll (with parent contact) in
          Students.
        </p>
      </div>

      <label className="block text-sm font-medium text-kpa-navy mb-1 mt-4">Notes</label>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
      />

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-kpa-navy text-white font-semibold py-2.5 rounded-lg hover:bg-kpa-navy/90 disabled:opacity-50"
      >
        {isPending ? "Submitting..." : "Submit Attendance Check"}
      </button>
    </form>
  );
}
