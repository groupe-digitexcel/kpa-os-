"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import BilingualText from "@/components/BilingualText";

export default function SuperAdminSecurity() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères / Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas / Passwords do not match.");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setPassword("");
    setConfirm("");
    setMessage("Mot de passe mis à jour avec succès / Password updated successfully.");
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-kpa-navy">
        <BilingualText fr="Sécurité du compte" en="Account Security" />
      </h2>
      <p className="mt-1 text-sm text-gray-500">
        <BilingualText
          fr="Changez le mot de passe du compte Super Administrateur connecté."
          en="Change the password of the signed-in Super Administrator account."
        />
      </p>
      <form onSubmit={submit} className="mt-5 space-y-4 max-w-lg">
        <label className="block text-sm font-medium text-gray-700">
          <BilingualText fr="Nouveau mot de passe" en="New password" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          <BilingualText fr="Confirmer le mot de passe" en="Confirm password" />
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-green-700">{message}</p>}
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-kpa-navy px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          <BilingualText fr={busy ? "Mise à jour…" : "Mettre à jour"} en={busy ? "Updating…" : "Update password"} />
        </button>
      </form>
    </div>
  );
}
