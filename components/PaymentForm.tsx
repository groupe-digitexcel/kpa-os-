"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { searchStudents, createPayment } from "@/lib/actions/payments";

type StudentResult = {
  id: string;
  full_name: string;
  age: number | null;
  sex: string | null;
  total_fee_due: number;
  class: { name: string } | null;
  parent: { full_name: string; phone_primary: string } | null;
};

const PAYMENT_TYPES = [
  { value: "school_fee", label: "School Fee / Frais de Scolarité" },
  { value: "exam_fee", label: "Exam Fee / Frais d'Examen" },
  { value: "xmas_party", label: "Xmas Party / Fête de Noël" },
  { value: "end_of_year_party", label: "End of Year Party / Fête de Fin d'Année" },
  { value: "uniform", label: "Uniform / Uniforme" },
  { value: "sportswear", label: "Sportswear / Tenue de Sport" },
  { value: "other", label: "Other / Autre" },
];

export default function PaymentForm() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StudentResult[]>([]);
  const [selected, setSelected] = useState<StudentResult | null>(null);
  const [amount, setAmount] = useState("");
  const [paymentType, setPaymentType] = useState("school_fee");
  const [method, setMethod] = useState<"cash" | "momo" | "orange_money" | "other">("cash");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  async function handleSearch(value: string) {
    setQuery(value);
    setSelected(null);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const res = await searchStudents(value);
    setResults(res as StudentResult[]);
    setSearching(false);
  }

  function handleSelect(student: StudentResult) {
    setSelected(student);
    setQuery(student.full_name);
    setResults([]);
    if (student.total_fee_due > 0) setAmount(String(student.total_fee_due));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selected) {
      setError("Please select a student first.");
      return;
    }
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError("Enter a valid amount.");
      return;
    }

    startTransition(async () => {
      const result = await createPayment({
        studentId: selected.id,
        amount: numAmount,
        paymentType: paymentType as any,
        method,
        notes: notes || undefined,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setSuccess(`Receipt ${result.data.receipt_number} recorded.`);
      // reset form
      setSelected(null);
      setQuery("");
      setAmount("");
      setNotes("");

      router.push(`/dashboard/secretary/payments/receipt/${result.data.receipt_number}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      {error && <div className="bg-red-50 text-red-600 text-sm p-2 rounded mb-4">{error}</div>}
      {success && (
        <div className="bg-green-50 text-green-700 text-sm p-2 rounded mb-4">{success}</div>
      )}

      <label className="block text-sm font-medium text-kpa-navy mb-1">
        Student / Élève
      </label>
      <div className="relative mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Type student name..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
          autoComplete="off"
        />
        {searching && <p className="text-xs text-gray-400 mt-1">Searching...</p>}
        {results.length > 0 && (
          <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-64 overflow-y-auto">
            {results.map((s) => (
              <button
                type="button"
                key={s.id}
                onClick={() => handleSelect(s)}
                className="w-full text-left px-3 py-2 hover:bg-kpa-cream text-sm border-b border-gray-50 last:border-0"
              >
                <p className="font-medium text-kpa-navy">{s.full_name}</p>
                <p className="text-xs text-gray-500">
                  {s.class?.name ?? "No class"} · {s.parent?.full_name ?? "No parent on file"}
                  {s.total_fee_due > 0 && (
                    <span className="text-red-500"> · Owes {s.total_fee_due.toLocaleString()} XAF</span>
                  )}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="bg-kpa-cream rounded-lg p-3 mb-4 text-sm">
          <p className="font-medium text-kpa-navy">{selected.full_name}</p>
          <p className="text-gray-500">
            {selected.class?.name} · Balance due: {selected.total_fee_due.toLocaleString()} XAF
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-kpa-navy mb-1">Payment Type</label>
          <select
            value={paymentType}
            onChange={(e) => setPaymentType(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
          >
            {PAYMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-kpa-navy mb-1">Method</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as any)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
          >
            <option value="cash">Cash / Espèces</option>
            <option value="momo">MTN MoMo</option>
            <option value="orange_money">Orange Money</option>
            <option value="other">Other / Autre</option>
          </select>
        </div>
      </div>

      <label className="block text-sm font-medium text-kpa-navy mb-1">Amount (XAF)</label>
      <input
        type="number"
        min="1"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
      />

      <label className="block text-sm font-medium text-kpa-navy mb-1">Notes (optional)</label>
      <input
        type="text"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
      />

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-kpa-navy text-white font-semibold py-2.5 rounded-lg hover:bg-kpa-navy/90 disabled:opacity-50"
      >
        {isPending ? "Recording..." : "Record Payment & Generate Receipt"}
      </button>
    </form>
  );
}
