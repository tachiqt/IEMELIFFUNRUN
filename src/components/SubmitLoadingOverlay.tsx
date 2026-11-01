"use client";

import Lottie from "lottie-react";
import { useEffect, useState } from "react";
import { useLanguage } from "./LanguageProvider";
import type { TranslationKey } from "@/lib/i18n";

const STATUS_KEYS = ["overlay1", "overlay2", "overlay3"] as const satisfies TranslationKey[];

export function SubmitLoadingOverlay({ open }: { open: boolean }) {
  const { t } = useLanguage();
  const [animationData, setAnimationData] = useState<object | null>(null);
  const [statusIndex, setStatusIndex] = useState(0);

  useEffect(() => {
    if (!open || animationData) return;
    fetch("/images/run.json")
      .then((res) => res.json())
      .then(setAnimationData)
      .catch(() => undefined);
  }, [open, animationData]);

  useEffect(() => {
    if (!open) {
      setStatusIndex(0);
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setInterval(() => {
      setStatusIndex((index) => (index + 1) % STATUS_KEYS.length);
    }, 1800);
    return () => {
      document.body.style.overflow = previous;
      window.clearInterval(timer);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-navy-deep/25 backdrop-blur-md"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center px-6">
        <div className="h-56 w-56 sm:h-64 sm:w-64">
          {animationData ? (
            <Lottie animationData={animationData} loop autoplay className="h-full w-full" />
          ) : (
            <div className="h-full w-full rounded-full border-4 border-teal/25 border-t-teal animate-spin" />
          )}
        </div>
        <p className="mt-4 text-center text-sm font-extrabold tracking-tight text-navy">{t(STATUS_KEYS[statusIndex])}</p>
        <p className="mt-1 text-center text-xs font-medium text-slate-500">{t("overlayWait")}</p>
      </div>
    </div>
  );
}
