"use client";

import Image from "next/image";
import type { TranslationKey } from "@/lib/i18n";
import { useLanguage } from "./LanguageProvider";

const QRS = [
  {
    src: "/images/gcashqr.jpg",
    label: "qrGcash" as const,
    width: 819,
    height: 1043,
  },
  {
    src: "/images/maribankqr.jpg",
    label: "qrMaribank" as const,
    width: 1290,
    height: 1137,
  },
] as const satisfies ReadonlyArray<{
  src: string;
  label: TranslationKey;
  width: number;
  height: number;
}>;

export function PaymentQrCodes() {
  const { t } = useLanguage();

  return (
    <div className="mx-auto grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2 sm:items-stretch sm:gap-5">
      {QRS.map((qr) => (
        <figure
          key={qr.src}
          className="flex h-full flex-col overflow-hidden rounded-[24px] border border-slate-100 bg-white"
        >
          <figcaption className="px-4 pt-3 text-center text-[11px] font-extrabold uppercase tracking-[0.16em] text-navy/70">
            {t(qr.label)}
          </figcaption>
          <div className="relative mx-3 mb-3 mt-2 min-h-[280px] flex-1 sm:min-h-[320px]">
            <Image
              src={qr.src}
              alt={t(qr.label)}
              fill
              sizes="(max-width: 640px) 100vw, 320px"
              className="object-contain"
            />
          </div>
        </figure>
      ))}
    </div>
  );
}
