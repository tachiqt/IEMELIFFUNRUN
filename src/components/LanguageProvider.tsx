"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { interpolate, translations, type Lang, type TranslationKey } from "@/lib/i18n";

const STORAGE_KEY = "agos-lang";

type LanguageContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "tl") setLangState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === "tl" ? "tl" : "en";
  }, [lang]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      setLang: (next) => {
        setLangState(next);
        window.localStorage.setItem(STORAGE_KEY, next);
      },
      t: (key, vars) => {
        const template = translations[lang][key] || translations.en[key];
        return vars ? interpolate(template, vars) : template;
      },
    }),
    [lang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return context;
}

export function LanguageToggle() {
  const { lang, setLang, t } = useLanguage();
  return (
    <div className="inline-flex rounded-full bg-sand p-1 text-xs font-extrabold">
      <button
        type="button"
        onClick={() => setLang("en")}
        className={`rounded-full px-3 py-1.5 ${lang === "en" ? "bg-navy text-white" : "text-navy/60"}`}
      >
        {t("langEn")}
      </button>
      <button
        type="button"
        onClick={() => setLang("tl")}
        className={`rounded-full px-3 py-1.5 ${lang === "tl" ? "bg-navy text-white" : "text-navy/60"}`}
      >
        {t("langTl")}
      </button>
    </div>
  );
}
