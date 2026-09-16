"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { parentLogin } from "@/lib/actions/parentPortal";
import BilingualText from "@/components/BilingualText";
import type { Language } from "@/lib/i18n/translations";

const STORAGE_KEY = "kpa-os-language";
const EVENT_NAME = "kpa-os-language-change";

export default function ParentPortalLogin() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>("fr");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "fr" || saved === "en") setLanguage(saved);
    const onChange = (event: Event) => {
      const next = (event as CustomEvent<Language>).detail;
      if (next === "fr" || next === "en") setLanguage(next);
    };
    window.addEventListener(EVENT_NAME, onChange);
    return () => window.removeEventListener(EVENT_NAME, onChange);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await parentLogin(phone, code);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push("/parent-portal/dashboard");
  }

  const accessCodePlaceholder = language === "fr" ? "Fourni par le bureau de l’école" : "Given by the school office";

  return (
    <main className="min-h-screen flex items-center justify-center bg-kpa-cream p-6">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm border-t-4 border-kpa-gold"
      >
        <h1 className="text-xl font-bold text-kpa-navy mb-1">Kingdom Passion Academy</h1>
        <p className="text-sm text-gray-500 mb-6"><BilingualText fr="Portail des Parents" en="Parent Portal" /></p>

        {error && <div className="bg-red-50 text-red-600 text-sm p-2 rounded mb-4">{error}</div>}

        <label className="block text-sm font-medium text-kpa-navy mb-1">
          <BilingualText fr="Votre numéro de téléphone" en="Your Phone Number" />
        </label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="6XX XXX XXX"
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
        />

        <label className="block text-sm font-medium text-kpa-navy mb-1">
          <BilingualText fr="Code d’accès" en="Access Code" />
        </label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder={accessCodePlaceholder}
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-6 uppercase focus:outline-none focus:ring-2 focus:ring-kpa-gold"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-kpa-navy text-white font-semibold py-2.5 rounded-lg hover:bg-kpa-navy/90 disabled:opacity-50"
        >
          {loading ? "..." : <BilingualText fr="Voir les informations de mon enfant" en="View My Child's Information" />}
        </button>

        <p className="text-xs text-gray-400 mt-4 text-center">
          <BilingualText fr="Vous n’avez pas de code ? Demandez-le au bureau de l’école." en="Don't have a code? Ask the school office." />
        </p>
      </form>
    </main>
  );
}
