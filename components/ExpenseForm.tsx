"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createExpense, type ExpenseCategory } from "@/lib/actions/expenses";
import BilingualText from "@/components/BilingualText";

const categories: { value: ExpenseCategory; fr: string; en: string }[] = [
  { value: "salaries", fr: "Salaires", en: "Salaries" },
  { value: "utilities", fr: "Services publics", en: "Utilities" },
  { value: "supplies", fr: "Fournitures", en: "Supplies" },
  { value: "maintenance", fr: "Entretien", en: "Maintenance" },
  { value: "food", fr: "Alimentation", en: "Food" },
  { value: "transport", fr: "Transport", en: "Transport" },
  { value: "marketing", fr: "Marketing", en: "Marketing" },
  { value: "other", fr: "Autre", en: "Other" },
];

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
      <h2 className="font-semibold text-kpa-navy text-sm mb-4"><BilingualText fr="Enregistrer une dépense" en="Record an Expense" /></h2>

      {error && <div className="bg-red-50 text-red-600 text-sm p-2 rounded mb-4"><BilingualText fr="La description et le montant sont obligatoires." en="Description and amount are required." /></div>}
      {success && <div className="bg-green-50 text-green-700 text-sm p-2 rounded mb-4"><BilingualText fr="Dépense enregistrée." en="Expense recorded." /></div>}

      <label className="block text-sm font-medium text-kpa-navy mb-1"><BilingualText fr="Catégorie" en="Category" /></label>
      <select value={category} onChange={(e) => setCategory(e.target.value as any)} className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold">
        {categories.map((item) => <option key={item.value} value={item.value}>{item.fr} / {item.en}</option>)}
      </select>

      <label className="block text-sm font-medium text-kpa-navy mb-1"><BilingualText fr="Description" en="Description" /></label>
      <input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold" />

      <label className="block text-sm font-medium text-kpa-navy mb-1"><BilingualText fr="Montant (XAF)" en="Amount (XAF)" /></label>
      <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold" />

      <label className="block text-sm font-medium text-kpa-navy mb-1"><BilingualText fr="Référence reçu/facture (facultatif)" en="Receipt/Invoice Reference (optional)" /></label>
      <input value={receiptNote} onChange={(e) => setReceiptNote(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-kpa-gold" />

      <button type="submit" disabled={isPending} className="w-full bg-kpa-navy text-white font-semibold py-2.5 rounded-lg hover:bg-kpa-navy/90 disabled:opacity-50">
        {isPending ? <BilingualText fr="Enregistrement..." en="Saving..." /> : <BilingualText fr="Enregistrer la dépense" en="Record Expense" />}
      </button>
    </form>
  );
}
