"use client";

import { useState, useEffect, useTransition } from "react";
import { hasLocalPin, setLocalPin } from "@/lib/actions/pinAuth";
import BilingualText from "@/components/BilingualText";

export default function PinSetupPrompt() {
  const [checked, setChecked] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    hasLocalPin().then((has) => {
      setNeedsSetup(!has);
      setChecked(true);
    });
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{4,6}$/.test(pin)) return setError("PIN must be 4-6 digits.");
    if (pin !== confirmPin) return setError("PINs don't match.");

    startTransition(async () => {
      const result = await setLocalPin(pin);
      if (result.error) return setError(result.error);
      setSuccess(true);
      setNeedsSetup(false);
    });
  }

  if (!checked || !needsSetup || dismissed || success) return null;

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-kpa-gold/40 mb-6">
      <div className="flex items-start justify-between mb-2">
        <p className="text-sm font-semibold text-kpa-navy"><BilingualText fr="Configurer la connexion PIN hors ligne" en="Set up offline PIN login" /></p>
        <button onClick={() => setDismissed(true)} className="text-xs text-gray-400">
          <BilingualText fr="Plus tard" en="Later" />
        </button>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        <BilingualText fr="Permet de démarrer une nouvelle session sur cet ordinateur même sans Internet — au lieu de saisir l’e-mail et le mot de passe (Internet est requis la première fois chaque jour)." en="Lets you start a fresh session on this computer even if the internet is down — instead of typing your email/password (which needs internet the first time each day)." />
      </p>

      {error && <div className="bg-red-50 text-red-600 text-xs p-2 rounded mb-2">{error}</div>}

      <form onSubmit={handleSubmit} className="flex gap-2 items-end flex-wrap">
        <div>
          <label className="block text-xs text-gray-500 mb-1"><BilingualText fr="PIN (4-6 chiffres)" en="PIN (4-6 digits)" /></label>
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1"><BilingualText fr="Confirmer" en="Confirm" /></label>
          <input
            type="password"
            inputMode="numeric"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="bg-kpa-navy text-white text-sm font-semibold px-4 py-1.5 rounded-lg hover:bg-kpa-navy/90 disabled:opacity-50"
        >
          {isPending ? <BilingualText fr="Enregistrement..." en="Saving..." /> : <BilingualText fr="Définir le PIN" en="Set PIN" />}
        </button>
      </form>
    </div>
  );
}
