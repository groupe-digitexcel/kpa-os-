"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cacheStaffSessionLocally } from "@/lib/actions/auth";
import { getSchoolSettings } from "@/lib/actions/settings";
import { listPinEnabledStaff, pinLogin } from "@/lib/actions/pinAuth";
import BilingualText from "@/components/BilingualText";
import type { Language } from "@/lib/i18n/translations";

const STORAGE_KEY = "kpa-os-language";
const EVENT_NAME = "kpa-os-language-change";

const roleLabels: Record<string, { fr: string; en: string }> = {
  director: { fr: "Directeur", en: "Director" },
  accountant: { fr: "Comptable", en: "Accountant" },
  secretary: { fr: "Secrétaire-Intendant", en: "Secretary-Bursar" },
  teacher: { fr: "Enseignant", en: "Teacher" },
};

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [language, setLanguage] = useState<Language>("fr");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [schoolName, setSchoolName] = useState("Kingdom Passion Academy");
  const [mode, setMode] = useState<"password" | "pin">("password");
  const [pinStaff, setPinStaff] = useState<any[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [pin, setPin] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "fr" || saved === "en") setLanguage(saved);
    const onChange = (event: Event) => {
      const next = (event as CustomEvent<Language>).detail;
      if (next === "fr" || next === "en") setLanguage(next);
    };
    window.addEventListener(EVENT_NAME, onChange);

    getSchoolSettings().then((s) => setSchoolName(s.school_name));
    listPinEnabledStaff().then((staff) => {
      setPinStaff(staff);
      if (staff.length > 0) setSelectedStaffId((staff[0] as any).id);
    });

    return () => window.removeEventListener(EVENT_NAME, onChange);
  }, []);

  async function handlePinLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await pinLogin(selectedStaffId, pin);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(language === "fr" ? "Identifiants incorrects" : "Invalid credentials");
      setLoading(false);
      return;
    }

    await cacheStaffSessionLocally();
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-kpa-cream p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm border-t-4 border-kpa-gold">
        <h1 className="text-xl font-bold text-kpa-navy mb-1">{schoolName}</h1>
        <p className="text-sm text-gray-500 mb-4"><BilingualText fr="Portail du Personnel" en="Staff Portal" /></p>

        {error && <div className="bg-red-50 text-red-600 text-sm p-2 rounded mb-4">{error}</div>}

        {mode === "password" ? (
          <form onSubmit={handleLogin}>
            <label className="block text-sm font-medium text-kpa-navy mb-1"><BilingualText fr="E-mail" en="Email" /></label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
            />

            <label className="block text-sm font-medium text-kpa-navy mb-1"><BilingualText fr="Mot de passe" en="Password" /></label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-kpa-navy text-white font-semibold py-2.5 rounded-lg hover:bg-kpa-navy/90 disabled:opacity-50"
            >
              {loading ? <BilingualText fr="Connexion..." en="Signing in..." /> : <BilingualText fr="Se connecter" en="Login" />}
            </button>
          </form>
        ) : (
          <form onSubmit={handlePinLogin}>
            <label className="block text-sm font-medium text-kpa-navy mb-1"><BilingualText fr="Qui êtes-vous ?" en="Who are you?" /></label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
            >
              {pinStaff.map((s: any) => {
                const role = roleLabels[s.role];
                const roleText = role ? (language === "fr" ? role.fr : role.en) : s.role;
                return <option key={s.id} value={s.id}>{s.full_name} ({roleText})</option>;
              })}
            </select>

            <label className="block text-sm font-medium text-kpa-navy mb-1"><BilingualText fr="PIN" en="PIN" /></label>
            <input
              type="password"
              inputMode="numeric"
              required
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-6 tracking-widest focus:outline-none focus:ring-2 focus:ring-kpa-gold"
            />

            <button
              type="submit"
              disabled={loading || pinStaff.length === 0}
              className="w-full bg-kpa-navy text-white font-semibold py-2.5 rounded-lg hover:bg-kpa-navy/90 disabled:opacity-50"
            >
              {loading ? "..." : <BilingualText fr="Entrer avec le PIN" en="Enter with PIN" />}
            </button>
            {pinStaff.length === 0 && (
              <p className="text-xs text-gray-400 mt-3 text-center">
                <BilingualText
                  fr="Aucun membre du personnel n’a encore configuré de PIN sur cet ordinateur. Connectez-vous une fois avec votre e-mail et votre mot de passe, puis configurez-le depuis le tableau de bord."
                  en="No one has set up a PIN on this computer yet. Log in once with email/password, then set one up from the dashboard."
                />
              </p>
            )}
          </form>
        )}

        <button
          onClick={() => setMode(mode === "password" ? "pin" : "password")}
          className="w-full text-xs text-kpa-navy underline mt-4"
        >
          {mode === "password"
            ? <BilingualText fr="Utiliser plutôt le PIN hors ligne" en="Use offline PIN instead" />
            : <BilingualText fr="Utiliser plutôt l’e-mail et le mot de passe" en="Use email/password instead" />}
        </button>
      </div>
    </main>
  );
}
