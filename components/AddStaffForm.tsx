"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createStaffMember, type CreateStaffInput } from "@/lib/actions/staff";
import BilingualText from "@/components/BilingualText";

const roles: readonly [CreateStaffInput["role"], string, string][] = [
  ["secretary", "Secrétaire / Intendant", "Secretary / Bursar"],
  ["teacher", "Enseignant", "Teacher"],
  ["accountant", "Comptable", "Accountant"],
  ["director", "Directeur", "Director"],
  ["auditor", "Auditeur", "Auditor"],
  ["super_admin", "Super Administrateur", "Super Administrator"],
];

export default function AddStaffForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<CreateStaffInput["role"]>("secretary");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setSuccess(null);
    if (!fullName.trim() || !email.trim() || password.length < 6) {
      setError("Full name, email, and a password of at least 6 characters are required."); return;
    }
    startTransition(async () => {
      const result = await createStaffMember({ fullName, role, phone: phone || undefined, email, password });
      if (result.error) return setError(result.error);
      setSuccess("Staff member created successfully.");
      setFullName(""); setPhone(""); setEmail(""); setPassword(""); router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <h2 className="font-semibold text-kpa-navy text-sm mb-4"><BilingualText fr="Ajouter un membre du personnel" en="Add Staff Member" /></h2>
      {error && <div className="bg-red-50 text-red-600 text-sm p-2 rounded mb-4"><BilingualText fr="Une erreur est survenue. Vérifiez les informations et vos droits d’administration." en="An error occurred. Check the information and your administration permissions." /></div>}
      {success && <div className="bg-green-50 text-green-700 text-sm p-2 rounded mb-4"><BilingualText fr="Membre du personnel créé avec succès." en="Staff member created successfully." /></div>}
      <label className="block text-sm font-medium text-kpa-navy mb-1"><BilingualText fr="Nom complet" en="Full Name" /></label>
      <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold" />
      <label className="block text-sm font-medium text-kpa-navy mb-1"><BilingualText fr="Rôle" en="Role" /></label>
      <select value={role} onChange={(e) => setRole(e.target.value as CreateStaffInput["role"])} className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold">
        {roles.map(([value, fr, en]) => <option key={value} value={value}>{fr} / {en}</option>)}
      </select>
      <label className="block text-sm font-medium text-kpa-navy mb-1"><BilingualText fr="Téléphone" en="Phone" /></label>
      <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold" />
      <label className="block text-sm font-medium text-kpa-navy mb-1"><BilingualText fr="E-mail (utilisé pour la connexion)" en="Email (used to log in)" /></label>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold" />
      <label className="block text-sm font-medium text-kpa-navy mb-1"><BilingualText fr="Mot de passe temporaire" en="Temporary Password" /></label>
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Temporary password" className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-kpa-gold" />
      <button type="submit" disabled={isPending} className="w-full bg-kpa-navy text-white font-semibold py-2.5 rounded-lg hover:bg-kpa-navy/90 disabled:opacity-50">
        {isPending ? <BilingualText fr="Création..." en="Creating..." /> : <BilingualText fr="Créer la connexion" en="Create Login" />}
      </button>
    </form>
  );
}
