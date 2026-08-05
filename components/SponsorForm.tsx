"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSponsor } from "@/lib/actions/sponsors";

export default function SponsorForm() {
  const router = useRouter();
  const [orgName, setOrgName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [purpose, setPurpose] = useState("");
  const [amountRequested, setAmountRequested] = useState("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!orgName.trim()) {
      setError("Organization name is required.");
      return;
    }

    startTransition(async () => {
      const result = await createSponsor({
        organizationName: orgName,
        contactName: contactName || undefined,
        contactEmail: contactEmail || undefined,
        contactPhone: contactPhone || undefined,
        purpose: purpose || undefined,
        amountRequested: Number(amountRequested) || undefined,
        notes: notes || undefined,
      });
      if (result.error) return setError(result.error);
      setSuccess("Sponsor lead added.");
      setOrgName("");
      setContactName("");
      setContactEmail("");
      setContactPhone("");
      setPurpose("");
      setAmountRequested("");
      setNotes("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <h2 className="font-semibold text-kpa-navy text-sm mb-4">New Sponsor / Institution</h2>

      {error && <div className="bg-red-50 text-red-600 text-sm p-2 rounded mb-4">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 text-sm p-2 rounded mb-4">{success}</div>}

      <label className="block text-sm font-medium text-kpa-navy mb-1">Organization Name</label>
      <input value={orgName} onChange={(e) => setOrgName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold" />

      <div className="grid grid-cols-2 gap-3 mb-4">
        <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Contact name" className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-kpa-gold" />
        <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="Contact phone" className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-kpa-gold" />
      </div>

      <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="Contact email" className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold" />

      <label className="block text-sm font-medium text-kpa-navy mb-1">Purpose of Request</label>
      <textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={2} placeholder="e.g. classroom furniture, library books" className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold" />

      <label className="block text-sm font-medium text-kpa-navy mb-1">Amount Requested (XAF, optional)</label>
      <input type="number" value={amountRequested} onChange={(e) => setAmountRequested(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold" />

      <label className="block text-sm font-medium text-kpa-navy mb-1">Notes</label>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-kpa-gold" />

      <button type="submit" disabled={isPending} className="w-full bg-kpa-navy text-white font-semibold py-2.5 rounded-lg hover:bg-kpa-navy/90 disabled:opacity-50">
        {isPending ? "Saving..." : "Add Sponsor Lead"}
      </button>
    </form>
  );
}
