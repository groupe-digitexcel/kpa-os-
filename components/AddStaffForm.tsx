"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createStaffMember } from "@/lib/actions/staff";

export default function AddStaffForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"director" | "accountant" | "secretary" | "teacher" | "auditor">("secretary");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!fullName.trim() || !email.trim() || password.length < 6) {
      setError("Full name, email, and a password of at least 6 characters are required.");
      return;
    }

    startTransition(async () => {
      const result = await createStaffMember({ fullName, role, phone: phone || undefined, email, password });
      if (result.error) return setError(result.error);
      setSuccess(`${fullName} can now log in with ${email}.`);
      setFullName("");
      setPhone("");
      setEmail("");
      setPassword("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <h2 className="font-semibold text-kpa-navy text-sm mb-4">Add Staff Member</h2>

      {error && <div className="bg-red-50 text-red-600 text-sm p-2 rounded mb-4">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 text-sm p-2 rounded mb-4">{success}</div>}

      <label className="block text-sm font-medium text-kpa-navy mb-1">Full Name</label>
      <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold" />

      <label className="block text-sm font-medium text-kpa-navy mb-1">Role</label>
      <select value={role} onChange={(e) => setRole(e.target.value as any)} className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold">
        <option value="secretary">Secretary / Bursar</option>
        <option value="teacher">Teacher</option>
        <option value="accountant">Accountant</option>
        <option value="director">Director</option>
        <option value="auditor">Auditor</option>
      </select>

      <label className="block text-sm font-medium text-kpa-navy mb-1">Phone</label>
      <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold" />

      <label className="block text-sm font-medium text-kpa-navy mb-1">Email (used to log in)</label>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold" />

      <label className="block text-sm font-medium text-kpa-navy mb-1">Temporary Password</label>
      <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Share this with them directly, not by SMS" className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-kpa-gold" />

      <button type="submit" disabled={isPending} className="w-full bg-kpa-navy text-white font-semibold py-2.5 rounded-lg hover:bg-kpa-navy/90 disabled:opacity-50">
        {isPending ? "Creating..." : "Create Login"}
      </button>
    </form>
  );
}
