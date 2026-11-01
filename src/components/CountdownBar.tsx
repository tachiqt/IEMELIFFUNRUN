"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "./LanguageProvider";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function remainingParts(targetIso: string | null, nowMs: number) {
  if (!targetIso) return null;
  const ms = new Date(targetIso).getTime() - nowMs;
  if (ms <= 0) return { ended: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  const totalSeconds = Math.floor(ms / 1000);
  return {
    ended: false,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

export function CountdownDigits({
  targetIso,
  tone = "dark",
  labels = { days: "Days", hrs: "Hrs", min: "Min", sec: "Sec" },
}: {
  targetIso: string | null;
  tone?: "dark" | "light";
  labels?: { days: string; hrs: string; min: string; sec: string };
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const light = tone === "light";
  const parts = remainingParts(targetIso, now);
  if (!targetIso) {
    return (
      <p className={`text-sm font-semibold ${light ? "text-slate-400" : "text-white/70"}`}>No end date set</p>
    );
  }
  if (!parts || parts.ended) {
    return (
      <p className={`text-lg font-extrabold tracking-wide ${light ? "text-orange" : "text-white"}`}>Ended</p>
    );
  }

  const units = [
    { label: labels.days, value: pad(parts.days) },
    { label: labels.hrs, value: pad(parts.hours) },
    { label: labels.min, value: pad(parts.minutes) },
    { label: labels.sec, value: pad(parts.seconds) },
  ];

  return (
    <div className="flex items-end gap-1.5 sm:gap-2">
      {units.map((unit, index) => (
        <div key={unit.label} className="flex items-end gap-1.5 sm:gap-2">
          {index > 0 ? (
            <span className={`mb-1.5 text-lg font-extrabold sm:mb-2 ${light ? "text-slate-300" : "text-white/50"}`}>:</span>
          ) : null}
          <div
            className={`min-w-[2.6rem] rounded-xl px-1.5 py-1.5 text-center sm:min-w-[3.1rem] sm:px-2 ${
              light ? "bg-sand" : "bg-white/15"
            }`}
          >
            <p className={`font-mono text-lg font-extrabold leading-none sm:text-2xl ${light ? "text-navy" : "text-white"}`}>
              {unit.value}
            </p>
            <p className={`mt-1 text-[9px] font-bold uppercase tracking-[0.14em] ${light ? "text-slate-400" : "text-white/60"}`}>
              {unit.label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function OptionCountdownCard({
  open,
  openTone,
  title,
  openLabel,
  closedLabel,
  targetIso,
  labels,
  openFallback,
}: {
  open: boolean;
  openTone: string;
  title: string;
  openLabel: string;
  closedLabel: string;
  targetIso: string | null;
  labels: { days: string; hrs: string; min: string; sec: string };
  openFallback: string;
}) {
  return (
    <div className={`rounded-2xl px-4 py-3.5 ${open ? openTone : "bg-white/10"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/80">{title}</p>
          <p className="mt-1 text-sm font-bold text-white">{open ? openLabel : closedLabel}</p>
        </div>
        {open ? (
          targetIso ? (
            <CountdownDigits targetIso={targetIso} labels={labels} />
          ) : (
            <p className="text-sm font-bold text-white">{openFallback}</p>
          )
        ) : null}
      </div>
    </div>
  );
}

export function FormCountdownBar({
  discountedVisible,
  remainingCapSlots,
  discountedEndsAt,
  premiumOpen,
  premiumEndsAt,
  regularOpen,
  regularEndsAt,
}: {
  discountedVisible: boolean;
  remainingCapSlots: number;
  discountedEndsAt: string | null;
  premiumOpen: boolean;
  premiumEndsAt: string | null;
  regularOpen: boolean;
  regularEndsAt: string | null;
}) {
  const { t } = useLanguage();
  const labels = { days: t("days"), hrs: t("hrs"), min: t("min"), sec: t("sec") };

  return (
    <div className="grid gap-3 bg-navy px-4 py-4 sm:px-8 lg:grid-cols-3 lg:px-12">
      <OptionCountdownCard
        open={discountedVisible}
        openTone="bg-orange"
        title={t("promoTitle")}
        openLabel={t("promoOpen", { n: remainingCapSlots })}
        closedLabel={t("promoClosed")}
        targetIso={discountedEndsAt}
        labels={labels}
        openFallback={t("promoUntil")}
      />
      <OptionCountdownCard
        open={premiumOpen}
        openTone="bg-teal"
        title={t("premiumTitle")}
        openLabel={t("premiumOpen")}
        closedLabel={t("premiumClosed")}
        targetIso={premiumEndsAt}
        labels={labels}
        openFallback={t("openNow")}
      />
      <OptionCountdownCard
        open={regularOpen}
        openTone="bg-teal"
        title={t("regularTitle")}
        openLabel={t("regularOpen")}
        closedLabel={t("regularClosed")}
        targetIso={regularEndsAt}
        labels={labels}
        openFallback={t("openNow")}
      />
    </div>
  );
}
