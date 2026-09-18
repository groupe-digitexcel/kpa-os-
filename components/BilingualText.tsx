"use client";

import { useEffect, useState } from "react";
import { translations, type Language } from "@/lib/i18n/translations";

const STORAGE_KEY = "kpa-os-language";
const EVENT_NAME = "kpa-os-language-change";

type Props = {
  fr: string;
  en: string;
  className?: string;
};

export default function BilingualText({ fr, en, className }: Props) {
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

  return <span className={className}>{language === "fr" ? fr : en}</span>;
}

export function roleLabel(role: string): { fr: string; en: string } {
  const labels = translations.fr.role;
  const english = translations.en.role;
  const key = role as keyof typeof labels;
  return {
    fr: labels[key] ?? role,
    en: english[key] ?? role,
  };
}
