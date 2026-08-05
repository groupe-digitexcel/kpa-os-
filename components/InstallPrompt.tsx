"use client";

import { useEffect, useState } from "react";

function isIos() {
  return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
}

function isInStandaloneMode() {
  return "standalone" in window.navigator && (window.navigator as any).standalone;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [visible, setVisible] = useState(false);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const [iosMode, setIosMode] = useState(false);

  useEffect(() => {
    if (isInStandaloneMode()) return; // already installed, never show

    if (isIos()) {
      setIosMode(true);
      setVisible(true);
      return;
    }

    function handler(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    }
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (iosMode) {
      setShowIosInstructions(true);
      return;
    }
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 bg-kpa-navy text-white rounded-xl shadow-lg p-4 z-50">
      {showIosInstructions ? (
        <div>
          <p className="text-sm font-semibold text-kpa-gold mb-2">Installer sur iPhone/iPad</p>
          <ol className="text-xs text-white/80 space-y-1.5 list-decimal list-inside">
            <li>
              Appuyez sur l&apos;icône <span className="text-kpa-gold">Partager</span> en bas de Safari
            </li>
            <li>Faites défiler et choisissez &laquo; Sur l&apos;écran d&apos;accueil &raquo;</li>
            <li>Appuyez sur &laquo; Ajouter &raquo;</li>
          </ol>
          <button
            onClick={() => setVisible(false)}
            className="text-xs text-white/60 mt-3 underline"
          >
            Fermer
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-kpa-gold">Install KPA Academy</p>
            <p className="text-xs text-white/70">Add to your home screen for one-tap access</p>
          </div>
          <div className="flex gap-2 flex-none">
            <button onClick={() => setVisible(false)} className="text-xs text-white/60 px-2">
              Later
            </button>
            <button
              onClick={handleInstall}
              className="bg-kpa-gold text-kpa-navy text-xs font-semibold px-3 py-1.5 rounded-lg"
            >
              Install
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
