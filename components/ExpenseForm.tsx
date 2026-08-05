"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createExpense, type ExpenseCategory } from "@/lib/actions/expenses";

export default function ExpenseForm() {
  const router = useRouter();
  const [category, setCategory] = useState<ExpenseCategory>("supplies");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [receiptNote, setReceiptNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!description.trim() || !amount) {
      setError("Description and amount are required.");
      return;
    }

    startTransition(async () => {
      const result = await createExpense({ category, description, amount: Number(amount), receiptNote: receiptNote || undefined });
      if (result.error) return setError(result.error);
      setSuccess("Expense recorded.");
      setDescription("");
      setAmount("");
      setReceiptNote("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <h2 className="font-semibold text-kpa-navy text-sm mb-4">Record an Expense</h2>

      {error && <div className="bg-red-50 text-red-600 text-sm p-2 rounded mb-4">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 text-sm p-2 rounded mb-4">{success}</div>}

      <label className="block text-sm font-medium text-kpa-navy mb-1">Category</label>
      <select value={category} onChange={(e) => setCategory(e.target.value as any)} className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold">
        <option value="salaries">Salaries</option>
        <option value="utilities">Utilities</option>
        <option value="supplies">Supplies</option>
        <option value="maintenance">Maintenance</option>
        <option value="food">Food</option>
        <option value="transport">Transport</option>
        <option value="marketing">Marketing</option>
        <option value="other">Other</option>
      </select>

      <label className="block text-sm font-medium text-kpa-navy mb-1">Description</label>
      <input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold" />

      <label className="block text-sm font-medium text-kpa-navy mb-1">Amount (XAF)</label>
      <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold" />

      <label className="block text-sm font-medium text-kpa-navy mb-1">Receipt/Invoice Reference (optional)</label>
      <input value={receiptNote} onChange={(e) => setReceiptNote(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-kpa-gold" />

      <button type="submit" disabled={isPending} className="w-full bg-kpa-navy text-white font-semibold py-2.5 rounded-lg hover:bg-kpa-navy/90 disabled:opacity-50">
        {isPending ? "Saving..." : "Record Expense"}
      </button>
    </form>
  );
}
