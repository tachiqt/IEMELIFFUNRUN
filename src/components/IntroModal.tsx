"use client";

import { useEffect } from "react";
import { ClipboardCheck, Hash, Shirt, Waves } from "lucide-react";
import { useLanguage, LanguageToggle } from "./LanguageProvider";
import type { TranslationKey } from "@/lib/i18n";

const STEPS = [
  { number: "01", title: "intro1Title", body: "intro1Body", icon: ClipboardCheck },
  { number: "02", title: "intro2Title", body: "intro2Body", icon: Hash },
  { number: "03", title: "intro3Title", body: "intro3Body", icon: Shirt },
] as const satisfies ReadonlyArray<{
  number: string;
  title: TranslationKey;
  body: TranslationKey;
  icon: typeof ClipboardCheck;
}>;

export function IntroModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLanguage();

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previousPosition = document.body.style.position;
    const previousTop = document.body.style.top;
    const previousWidth = document.body.style.width;
    const scrollY = window.scrollY;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.position = previousPosition;
      document.body.style.top = previousTop;
      document.body.style.width = previousWidth;
      window.scrollTo(0, scrollY);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 sm:flex sm:items-center sm:justify-center sm:p-6">
      <button
        type="button"
        aria-label="Close introduction"
        className="intro-backdrop absolute inset-0 bg-navy-deep/55 backdrop-blur-md"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="intro-title"
        className="intro-modal relative z-10 h-[100dvh] w-full overflow-y-auto bg-white sm:h-auto sm:max-h-[92dvh] sm:max-w-[540px] sm:rounded-[32px] sm:shadow-[0_40px_80px_-24px_rgba(0,26,51,0.55)]"
      >
        <div className="relative overflow-hidden bg-gradient-to-br from-navy-deep via-navy to-[#014f7a] px-6 pb-6 pt-6 text-white sm:px-8 sm:pb-7 sm:pt-8">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-teal/30 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-16 left-10 h-32 w-32 rounded-full bg-orange/25 blur-2xl" />
          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-teal">
                <Waves className="h-3.5 w-3.5" />
                {t("introKicker")}
              </span>
              <LanguageToggle />
            </div>
            <h2 id="intro-title" className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">
              {t("introTitle")}
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-white/75">{t("introLead")}</p>
          </div>
        </div>

        <div className="px-6 py-6 sm:px-8">
          <ol className="space-y-4">
            {STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <li key={step.number} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sand text-navy shadow-[inset_0_0_0_1px_rgba(0,51,102,0.06)]">
                      <Icon className="h-5 w-5" />
                    </span>
                    {step.number !== "03" ? <span className="mt-2 h-full w-px bg-slate-200" /> : null}
                  </div>
                  <div className="pb-1">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-orange">Step {step.number}</p>
                    <h3 className="mt-1 text-[15px] font-extrabold leading-snug text-navy">{t(step.title)}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{t(step.body)}</p>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="mt-5 rounded-2xl border border-orange/20 bg-orange/[0.07] px-4 py-4">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-orange">{t("introNote")}</p>
            <p className="mt-2 text-sm leading-6 text-navy/80">{t("introNoteBody")}</p>
          </div>

          <button
            type="button"
            autoFocus
            onClick={onClose}
            className="mt-6 w-full rounded-full bg-orange px-6 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-orange/30 transition hover:brightness-105"
          >
            {t("introStart")}
          </button>
        </div>
      </div>
    </div>
  );
}
