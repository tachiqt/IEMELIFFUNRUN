"use client";

import { Facebook, MapPin } from "lucide-react";
import { SOCIAL } from "@/lib/constants";
import { useLanguage } from "./LanguageProvider";

export function SiteFooter() {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-navy/10 bg-navy text-white">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-12">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/iemeliflogo.png" alt="IEMELIF" className="h-10 w-auto object-contain" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/lagunalogo.png" alt="Laguna" className="h-10 w-auto object-contain" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/cwmlogo.png" alt="CWM" className="h-10 w-auto object-contain" />
          </div>
          <p className="mt-4 text-lg font-extrabold tracking-tight">AGOS Family Run 2026</p>
          <p className="mt-1 text-sm text-white/70">{t("hostedBy")}</p>
          <div className="mt-5 flex flex-col gap-2">
            <a
              href={SOCIAL.adminFacebook}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-white/85 hover:text-teal"
            >
              <Facebook className="h-4 w-4" />
              {t("footerAdmin")}
            </a>
            <a
              href={SOCIAL.officialFacebook}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-white/85 hover:text-teal"
            >
              <Facebook className="h-4 w-4" />
              {t("footerOfficial")}
            </a>
          </div>
        </div>
        <div>
          <p className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-teal">
            <MapPin className="h-3.5 w-3.5" />
            {t("footerVenue")}
          </p>
          <a
            href={SOCIAL.mapUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 block text-sm font-semibold text-white underline-offset-2 hover:text-teal hover:underline"
          >
            {t("footerMap")}
          </a>
          <p className="mt-1 text-xs text-white/55">{t("footerMapOpen")}</p>
          <a
            href={SOCIAL.mapUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={t("footerMapOpen")}
            className="mt-4 block overflow-hidden rounded-2xl border border-white/10 bg-white transition hover:border-teal/50 hover:shadow-[0_0_0_2px_rgba(0,172,193,0.35)]"
          >
            <iframe
              title={t("footerMap")}
              src={SOCIAL.mapEmbed}
              className="pointer-events-none h-48 w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </a>
        </div>
      </div>
    </footer>
  );
}
