"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cacheStaffSessionLocally } from "@/lib/actions/auth";
import { getSchoolSettings } from "@/lib/actions/settings";
import { bootstrapLocalAdmin, getLocalAuthState, listPinEnabledStaff, pinLogin } from "@/lib/actions/pinAuth";
import BilingualText from "@/components/BilingualText";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import type { Language } from "@/lib/i18n/translations";

const STORAGE_KEY = "kpa-os-language";
const EVENT_NAME = "kpa-os-language-change";
const roleLabels: Record<string, { fr: string; en: string }> = {
  super_admin: { fr: "Super Administrateur", en: "Super Administrator" },
  director: { fr: "Directeur", en: "Director" },
  accountant: { fr: "Comptable", en: "Accountant" },
  secretary: { fr: "Secrétaire-Intendant", en: "Secretary-Bursar" },
  teacher: { fr: "Enseignant", en: "Teacher" },
  auditor: { fr: "Auditeur", en: "Auditor" },
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
  const [mode, setMode] = useState<"password" | "pin">("pin");
  const [local, setLocal] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [pinStaff, setPinStaff] = useState<any[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [pin, setPin] = useState("");
  const [adminName, setAdminName] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  async function refreshLocalState() {
    const state = await getLocalAuthState();
    setLocal(state.local); setInitialized(state.initialized);
    const staff = await listPinEnabledStaff();
    setPinStaff(staff);
    if (staff.length > 0) setSelectedStaffId((staff[0] as any).id);
    if (!state.local) setMode("password");
  }

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "fr" || saved === "en") setLanguage(saved);
    const onChange = (event: Event) => {
      const next = (event as CustomEvent<Language>).detail;
      if (next === "fr" || next === "en") setLanguage(next);
    };
    window.addEventListener(EVENT_NAME, onChange);
    getSchoolSettings().then((s) => setSchoolName(s.school_name));
    refreshLocalState();
    return () => window.removeEventListener(EVENT_NAME, onChange);
  }, []);

  async function handleBootstrap(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError(null);
    if (pin !== confirmPin) { setError(language === "fr" ? "Les deux PIN ne correspondent pas." : "The PINs do not match."); setLoading(false); return; }
    const result = await bootstrapLocalAdmin(adminName, pin);
    if (result.error) { setError(result.error); setLoading(false); return; }
    router.push("/dashboard"); router.refresh();
  }

  async function handlePinLogin(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError(null);
    const result = await pinLogin(selectedStaffId, pin);
    if (result.error) { setError(result.error); setLoading(false); return; }
    router.push("/dashboard"); router.refresh();
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(language === "fr" ? "Identifiants incorrects" : "Invalid credentials"); setLoading(false); return; }
    await cacheStaffSessionLocally();
    router.push("/dashboard"); router.refresh();
  }

  const canBootstrap = local && !initialized;

  return (
    <main className="min-h-screen flex items-center justify-center bg-kpa-cream p-6 relative">
      <div className="absolute top-4 right-4 bg-kpa-navy rounded-lg"><LanguageSwitcher /></div>
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm border-t-4 border-kpa-gold">
        <h1 className="text-xl font-bold text-kpa-navy mb-1">{schoolName}</h1>
        <p className="text-sm text-gray-500 mb-4">
          {local ? <BilingualText fr="Application de bureau hors ligne" en="Offline Desktop Application" /> : <BilingualText fr="Portail du Personnel" en="Staff Portal" />}
        </p>
        {error && <div className="bg-red-50 text-red-600 text-sm p-2 rounded mb-4">{error}</div>}

        {canBootstrap ? (
          <form onSubmit={handleBootstrap}>
            <div className="bg-green-50 text-green-800 text-sm p-3 rounded-lg mb-4">
              <BilingualText fr="Ce PC n’est pas encore initialisé. Créez le premier Super Administrateur hors ligne. Aucun compte Internet n’est requis." en="This PC is not initialized yet. Create the first Super Administrator offline. No online account is required." />
            </div>
            <label className="block text-sm font-medium text-kpa-navy mb-1"><BilingualText fr="Nom du Super Administrateur" en="Super Administrator name" /></label>
            <input required value={adminName} onChange={(e) => setAdminName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4" />
            <label className="block text-sm font-medium text-kpa-navy mb-1"><BilingualText fr="Créer le PIN" en="Create PIN" /></label>
            <input required type="password" inputMode="numeric" pattern="[0-9]{4,6}" value={pin} onChange={(e) => setPin(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 tracking-widest" />
            <label className="block text-sm font-medium text-kpa-navy mb-1"><BilingualText fr="Confirmer le PIN" en="Confirm PIN" /></label>
            <input required type="password" inputMode="numeric" pattern="[0-9]{4,6}" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-6 tracking-widest" />
            <button type="submit" disabled={loading} className="w-full bg-kpa-navy text-white font-semibold py-2.5 rounded-lg disabled:opacity-50">
              {loading ? "..." : <BilingualText fr="Initialiser KPA-OS hors ligne" en="Initialize KPA-OS offline" />}
            </button>
          </form>
        ) : mode === "pin" ? (
          <form onSubmit={handlePinLogin}>
            <label className="block text-sm font-medium text-kpa-navy mb-1"><BilingualText fr="Utilisateur" en="User" /></label>
            <select required value={selectedStaffId} onChange={(e) => setSelectedStaffId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4">
              {pinStaff.map((s: any) => {
                const role = roleLabels[s.role]; const roleText = role ? (language === "fr" ? role.fr : role.en) : s.role;
                return <option key={s.id} value={s.id}>{s.full_name} ({roleText})</option>;
              })}
            </select>
            <label className="block text-sm font-medium text-kpa-navy mb-1"><BilingualText fr="PIN hors ligne" en="Offline PIN" /></label>
            <input type="password" inputMode="numeric" required value={pin} onChange={(e) => setPin(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-6 tracking-widest" />
            <button type="submit" disabled={loading || pinStaff.length === 0} className="w-full bg-kpa-navy text-white font-semibold py-2.5 rounded-lg disabled:opacity-50">
              {loading ? "..." : <BilingualText fr="Ouvrir KPA-OS" en="Open KPA-OS" />}
            </button>
            {pinStaff.length === 0 && <p className="text-xs text-gray-400 mt-3 text-center"><BilingualText fr="Aucun PIN n’est configuré sur ce poste." en="No PIN is configured on this computer." /></p>}
          </form>
        ) : (
          <form onSubmit={handleLogin}>
            <label className="block text-sm font-medium text-kpa-navy mb-1"><BilingualText fr="E-mail" en="Email" /></label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4" />
            <label className="block text-sm font-medium text-kpa-navy mb-1"><BilingualText fr="Mot de passe" en="Password" /></label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-6" />
            <button type="submit" disabled={loading} className="w-full bg-kpa-navy text-white font-semibold py-2.5 rounded-lg disabled:opacity-50">
              {loading ? <BilingualText fr="Connexion..." en="Signing in..." /> : <BilingualText fr="Se connecter" en="Login" />}
            </button>
          </form>
        )}

        {!canBootstrap && local && <button onClick={() => setMode(mode === "pin" ? "password" : "pin")} className="w-full text-xs text-kpa-navy underline mt-4"><BilingualText fr={mode === "pin" ? "Utiliser e-mail/mot de passe (synchronisation)" : "Utiliser le PIN hors ligne"} en={mode === "pin" ? "Use email/password (sync)" : "Use offline PIN"} /></button>}
      </div>
    </main>
  );
}
