"use client";

import { ExternalLink, Waves } from "lucide-react";
import { useEffect } from "react";
import { LanguageToggle, useLanguage } from "./LanguageProvider";

export function MigrationModal({ newUrl }: { newUrl: string }) {
  const { t } = useLanguage();
  const target = newUrl.replace(/\/$/, "");

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousPosition = document.body.style.position;
    const previousTop = document.body.style.top;
    const previousWidth = document.body.style.width;
    const scrollY = window.scrollY;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.position = previousPosition;
      document.body.style.top = previousTop;
      document.body.style.width = previousWidth;
      window.scrollTo(0, scrollY);
    };
  }, []);

  function go() {
    window.location.assign(target);
  }

  return (
    <div className="fixed inset-0 z-[60] sm:flex sm:items-center sm:justify-center sm:p-6">
      <div className="absolute inset-0 bg-navy-deep/70 backdrop-blur-md" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="migration-title"
        className="relative z-10 flex h-[100dvh] w-full flex-col justify-center bg-white px-6 py-8 sm:h-auto sm:max-w-[520px] sm:rounded-[32px] sm:px-8 sm:py-9 sm:shadow-[0_40px_80px_-24px_rgba(0,26,51,0.55)]"
      >
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-navy/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-navy">
            <Waves className="h-3.5 w-3.5 text-teal" />
            {t("migrationKicker")}
          </span>
          <LanguageToggle />
        </div>

        <h2 id="migration-title" className="mt-5 text-2xl font-extrabold tracking-tight text-navy sm:text-3xl">
          {t("migrationTitle")}
        </h2>
        <p className="mt-3 text-sm leading-6 text-navy/70">{t("migrationBody")}</p>

        <div className="mt-5 rounded-2xl border border-navy/10 bg-sky-mist/60 px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-navy/45">
            {t("migrationLinkLabel")}
          </p>
          <a
            href={target}
            className="mt-1 block break-all text-sm font-semibold text-teal underline-offset-2 hover:underline"
          >
            {target}
          </a>
        </div>

        <button
          type="button"
          onClick={go}
          className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-orange px-5 py-3.5 text-sm font-extrabold uppercase tracking-[0.12em] text-white shadow-[0_12px_28px_-10px_rgba(242,101,34,0.65)] transition hover:brightness-105"
        >
          {t("migrationCta")}
          <ExternalLink className="h-4 w-4" />
        </button>
        <p className="mt-3 text-center text-xs leading-5 text-navy/50">{t("migrationNote")}</p>
      </div>
    </div>
  );
}
