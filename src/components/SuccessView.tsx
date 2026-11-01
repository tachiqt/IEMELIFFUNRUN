"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { STATUS_PATH } from "@/lib/constants";
import { LanguageToggle, useLanguage } from "./LanguageProvider";
import { SiteFooter } from "./SiteFooter";
import { TicketDownload } from "./TicketDownload";

export function SuccessView({
  firstName,
  ticketId,
  churchCode,
  otherChurchName,
}: {
  firstName: string;
  ticketId: string;
  churchCode: string;
  otherChurchName?: string | null;
}) {
  const { t } = useLanguage();
  const [statusLink, setStatusLink] = useState("");

  useEffect(() => {
    setStatusLink(`${window.location.host}${STATUS_PATH}`);
  }, []);

  return (
    <main className="wave-bg min-h-dvh">
      <div className="px-3 py-8 sm:px-6 sm:py-16">
        <div className="mx-auto w-full max-w-4xl">
          <div className="mb-6 flex justify-center">
            <LanguageToggle />
          </div>
          <p className="text-center text-[11px] font-bold uppercase tracking-[0.22em] text-teal">{t("successKicker")}</p>
          <h1 className="mt-3 text-center text-3xl font-extrabold tracking-tight text-navy sm:text-4xl">
            {t("successTitle", { name: firstName })}
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-center text-sm leading-6 text-slate-600">{t("successBody")}</p>
          <div className="mt-8">
            <TicketDownload ticketId={ticketId} churchCode={churchCode} otherChurchName={otherChurchName} />
          </div>
          <div className="mx-auto mt-6 max-w-xl rounded-[24px] border border-teal/20 bg-teal/[0.08] px-5 py-5 text-center">
            <p className="text-sm font-semibold leading-6 text-navy">{t("ticketStatusNote")}</p>
            <Link
              href={STATUS_PATH}
              target="_blank"
              className="mt-3 block break-all text-sm font-extrabold text-teal underline decoration-teal/40 underline-offset-4"
            >
              {statusLink || STATUS_PATH}
            </Link>
            <Link
              href={STATUS_PATH}
              target="_blank"
              className="mt-4 inline-flex rounded-full bg-navy px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-navy/30"
            >
              {t("ticketStatusCta")}
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/" className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-navy">
              {t("registerAnother")}
            </Link>
          </div>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
