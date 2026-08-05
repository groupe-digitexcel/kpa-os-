"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createInventoryItem, stockIn, issueItem } from "@/lib/actions/inventory";
import { searchStudents } from "@/lib/actions/payments";

type Item = {
  id: string;
  name: string;
  category: string;
  quantity_on_hand: number;
  reorder_threshold: number;
};

export default function InventoryManager({ items }: { items: Item[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<"add" | "stockin" | "issue">("issue");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // add item fields
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<"uniform" | "sportswear" | "stationery" | "equipment" | "other">("uniform");
  const [newQty, setNewQty] = useState("");

  // stock-in / issue fields
  const [selectedItemId, setSelectedItemId] = useState(items[0]?.id ?? "");
  const [qty, setQty] = useState("");
  const [txnType, setTxnType] = useState<"issued_free" | "sold" | "damaged" | "adjustment">("issued_free");
  const [studentQuery, setStudentQuery] = useState("");
  const [studentResults, setStudentResults] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [flagResale, setFlagResale] = useState(false);
  const [notes, setNotes] = useState("");

  async function handleStudentSearch(v: string) {
    setStudentQuery(v);
    setSelectedStudent(null);
    if (v.trim().length < 2) {
      setStudentResults([]);
      return;
    }
    const res = await searchStudents(v);
    setStudentResults(res);
  }

  function reset() {
    setNewName("");
    setNewQty("");
    setQty("");
    setStudentQuery("");
    setSelectedStudent(null);
    setFlagResale(false);
    setNotes("");
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!newName.trim() || !newQty) {
      setError("Item name and quantity are required.");
      return;
    }
    startTransition(async () => {
      const result = await createInventoryItem({
        name: newName,
        category: newCategory,
        quantity: Number(newQty),
      });
      if (result.error) return setError(result.error);
      setSuccess(`${newName} added to inventory.`);
      reset();
      router.refresh();
    });
  }

  function handleStockIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!selectedItemId || !qty) {
      setError("Select an item and quantity.");
      return;
    }
    startTransition(async () => {
      const result = await stockIn(selectedItemId, Number(qty), notes || undefined);
      if (result.error) return setError(result.error);
      setSuccess("Stock updated.");
      reset();
      router.refresh();
    });
  }

  function handleIssue(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!selectedItemId || !qty) {
      setError("Select an item and quantity.");
      return;
    }
    startTransition(async () => {
      const result = await issueItem({
        itemId: selectedItemId,
        quantity: Number(qty),
        studentId: selectedStudent?.id,
        transactionType: txnType,
        flaggedResale: flagResale,
        notes: notes || undefined,
      });
      if (result.error) return setError(result.error);
      setSuccess("Transaction recorded.");
      reset();
      router.refresh();
    });
  }

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className="flex gap-2 mb-4">
        {(["issue", "stockin", "add"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
              mode === m ? "bg-kpa-navy text-white" : "bg-kpa-cream text-kpa-navy"
            }`}
          >
            {m === "issue" ? "Issue/Sell" : m === "stockin" ? "Stock In" : "New Item"}
          </button>
        ))}
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm p-2 rounded mb-4">{error}</div>}
      {success && (
        <div className="bg-green-50 text-green-700 text-sm p-2 rounded mb-4">{success}</div>
      )}

      {mode === "add" && (
        <form onSubmit={handleAdd}>
          <label className="block text-sm font-medium text-kpa-navy mb-1">Item Name</label>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
          />
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-kpa-navy mb-1">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
              >
                <option value="uniform">Uniform</option>
                <option value="sportswear">Sportswear</option>
                <option value="stationery">Stationery</option>
                <option value="equipment">Equipment</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-kpa-navy mb-1">Starting Qty</label>
              <input
                type="number"
                min="0"
                value={newQty}
                onChange={(e) => setNewQty(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-kpa-navy text-white font-semibold py-2.5 rounded-lg hover:bg-kpa-navy/90 disabled:opacity-50"
          >
            {isPending ? "Adding..." : "Add Item"}
          </button>
        </form>
      )}

      {mode === "stockin" && (
        <form onSubmit={handleStockIn}>
          <label className="block text-sm font-medium text-kpa-navy mb-1">Item</label>
          <select
            value={selectedItemId}
            onChange={(e) => setSelectedItemId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
          >
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} ({i.quantity_on_hand} on hand)
              </option>
            ))}
          </select>
          <label className="block text-sm font-medium text-kpa-navy mb-1">Quantity Received</label>
          <input
            type="number"
            min="1"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
          />
          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-kpa-navy text-white font-semibold py-2.5 rounded-lg hover:bg-kpa-navy/90 disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Add Stock"}
          </button>
        </form>
      )}

      {mode === "issue" && (
        <form onSubmit={handleIssue}>
          <label className="block text-sm font-medium text-kpa-navy mb-1">Item</label>
          <select
            value={selectedItemId}
            onChange={(e) => setSelectedItemId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
          >
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} ({i.quantity_on_hand} on hand)
              </option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-kpa-navy mb-1">Type</label>
              <select
                value={txnType}
                onChange={(e) => setTxnType(e.target.value as any)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
              >
                <option value="issued_free">Issued Free (new student)</option>
                <option value="sold">Sold to Parent</option>
                <option value="damaged">Damaged / Written Off</option>
                <option value="adjustment">Adjustment</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-kpa-navy mb-1">Quantity</label>
              <input
                type="number"
                min="1"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
              />
            </div>
          </div>

          <label className="block text-sm font-medium text-kpa-navy mb-1">Student (optional)</label>
          <div className="relative mb-3">
            <input
              value={studentQuery}
              onChange={(e) => handleStudentSearch(e.target.value)}
              placeholder="Type student name..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
              autoComplete="off"
            />
            {studentResults.length > 0 && (
              <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                {studentResults.map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => {
                      setSelectedStudent(s);
                      setStudentQuery(s.full_name);
                      setStudentResults([]);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-kpa-cream text-sm"
                  >
                    {s.full_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {txnType === "sold" && (
            <label className="flex items-center gap-2 mb-4 text-sm">
              <input
                type="checkbox"
                checked={flagResale}
                onChange={(e) => setFlagResale(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-red-600">
                Flag for review (suspicious resale request — per school policy, uniforms are
                normally free for new students)
              </span>
            </label>
          )}

          <label className="block text-sm font-medium text-kpa-navy mb-1">Notes</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
          />

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-kpa-navy text-white font-semibold py-2.5 rounded-lg hover:bg-kpa-navy/90 disabled:opacity-50"
          >
            {isPending ? "Recording..." : "Record Transaction"}
          </button>
        </form>
      )}
    </div>
  );
}
