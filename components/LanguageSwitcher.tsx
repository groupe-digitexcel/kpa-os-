"use client";

import { useEffect, useState } from "react";
import type { Language } from "@/lib/i18n/translations";

const STORAGE_KEY = "kpa-os-language";
const EVENT_NAME = "kpa-os-language-change";

export default function LanguageSwitcher() {
  const [language, setLanguage] = useState<Language>("fr");

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

  function toggle() {
    const next: Language = language === "fr" ? "en" : "fr";
    window.localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next;
    setLanguage(next);
    window.dispatchEvent(new CustomEvent<Language>(EVENT_NAME, { detail: next }));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={language === "fr" ? "Switch to English" : "Passer en français"}
      title={language === "fr" ? "Switch to English" : "Passer en français"}
      className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20 transition"
    >
      <span aria-hidden="true">🌐</span>
      <span>{language === "fr" ? "EN" : "FR"}</span>
    </button>
  );
}
