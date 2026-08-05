"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createStudent } from "@/lib/actions/students";

export default function StudentForm({ classes }: { classes: { id: string; name: string }[] }) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<"M" | "F">("M");
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [parentName, setParentName] = useState("");
  const [phone1, setPhone1] = useState("");
  const [phone2, setPhone2] = useState("");
  const [feeDue, setFeeDue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!fullName.trim() || !classId || !parentName.trim() || !phone1.trim()) {
      setError("Student name, class, parent name, and phone number are required.");
      return;
    }

    startTransition(async () => {
      const result = await createStudent({
        fullName,
        age: Number(age) || 0,
        sex,
        classId,
        parentName,
        parentPhonePrimary: phone1,
        parentPhoneSecondary: phone2 || undefined,
        totalFeeDue: Number(feeDue) || 0,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setSuccess(`${fullName} enrolled successfully.`);
      setFullName("");
      setAge("");
      setParentName("");
      setPhone1("");
      setPhone2("");
      setFeeDue("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <h2 className="font-semibold text-kpa-navy text-sm mb-4">Enroll New Student</h2>

      {error && <div className="bg-red-50 text-red-600 text-sm p-2 rounded mb-4">{error}</div>}
      {success && (
        <div className="bg-green-50 text-green-700 text-sm p-2 rounded mb-4">{success}</div>
      )}

      <label className="block text-sm font-medium text-kpa-navy mb-1">Student Full Name</label>
      <input
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
      />

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-kpa-navy mb-1">Age</label>
          <input
            type="number"
            min="1"
            max="20"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-kpa-navy mb-1">Sex</label>
          <select
            value={sex}
            onChange={(e) => setSex(e.target.value as any)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
          >
            <option value="M">Male / Masculin</option>
            <option value="F">Female / Féminin</option>
          </select>
        </div>
      </div>

      <label className="block text-sm font-medium text-kpa-navy mb-1">Class</label>
      <select
        value={classId}
        onChange={(e) => setClassId(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
      >
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <div className="border-t border-gray-100 my-4 pt-4">
        <p className="text-xs text-gray-500 uppercase mb-3">Parent / Guardian</p>

        <label className="block text-sm font-medium text-kpa-navy mb-1">Full Name</label>
        <input
          value={parentName}
          onChange={(e) => setParentName(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-kpa-navy mb-1">Phone 1</label>
            <input
              value={phone1}
              onChange={(e) => setPhone1(e.target.value)}
              placeholder="6XX XXX XXX"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-kpa-navy mb-1">Phone 2</label>
            <input
              value={phone2}
              onChange={(e) => setPhone2(e.target.value)}
              placeholder="Optional"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
            />
          </div>
        </div>
      </div>

      <label className="block text-sm font-medium text-kpa-navy mb-1 mt-4">
        Outstanding Fee Balance (XAF)
      </label>
      <input
        type="number"
        min="0"
        value={feeDue}
        onChange={(e) => setFeeDue(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
      />

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-kpa-navy text-white font-semibold py-2.5 rounded-lg hover:bg-kpa-navy/90 disabled:opacity-50"
      >
        {isPending ? "Enrolling..." : "Enroll Student"}
      </button>
    </form>
  );
}
