"use client";

import { useEffect } from "react";

const STORAGE_KEY = "kpa-os-language";

export default function LanguageBootstrap() {
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const language = saved === "en" || saved === "fr" ? saved : "fr";
    document.documentElement.lang = language;
  }, []);

  return null;
}
