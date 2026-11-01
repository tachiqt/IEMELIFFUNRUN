"use client";

import { useState } from "react";
import { CheckCircle2, Clock3, ListChecks, Search, TriangleAlert } from "lucide-react";
import { AGE_CATEGORIES, SANDO_SIZES, formatPublicTicketIdInput, isPublicTicketId, normalizePublicTicketId } from "@/lib/constants";
import type { TranslationKey } from "@/lib/i18n";
import { Field, SectionCard, inputClass } from "./Field";
import { LanguageToggle, useLanguage } from "./LanguageProvider";
import { SiteFooter } from "./SiteFooter";

type PaymentStatus = "PENDING" | "VALID" | "DENIED";

type Found = {
  ticketId: string;
  fullName: string;
  age: number;
  sex: string;
  phone: string;
  facebook: string;
  ageCategory: string;
  sandoSize: string;
  packageLabel: string;
  amount: number;
  amountPaid?: number;
  balance?: number;
  churchName: string;
  paymentMode: string;
  paymentStatus: PaymentStatus;
  attendedAt: string | null;
};

function labelFor<T extends { id: string; label: string }>(items: readonly T[], id: string) {
  return items.find((item) => item.id === id)?.label ?? id.replaceAll("_", " ");
}

export function StatusView() {
  const { t } = useLanguage();
  const [ticketId, setTicketId] = useState("");
  const [found, setFound] = useState<Found | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function lookup() {
    setError("");
    setFound(null);
    const id = normalizePublicTicketId(ticketId);
    if (!isPublicTicketId(id)) {
      setError(t("statusIdInvalid"));
      return;
    }
    setTicketId(id);
    setBusy(true);
    try {
      const res = await fetch(`/api/status?ticketId=${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "No registration found for that ID.") setError(t("statusNotFound"));
        else if (String(data.error || "").toLowerCase().includes("race bib") || String(data.error || "").includes("numbers and a dash"))
          setError(t("statusIdInvalid"));
        else setError(data.error || t("errGeneric"));
        return;
      }
      setFound(data);
    } catch {
      setError(t("errGeneric"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="wave-bg min-h-dvh">
      <div className="px-4 py-8 sm:px-8 sm:py-12">
        <div className="mx-auto w-full max-w-3xl">
          <div className="mb-6 flex flex-col items-center gap-2">
            <LanguageToggle />
            <p className="text-center text-xs font-semibold text-slate-500">{t("statusLangHint")}</p>
          </div>
          <p className="text-center text-[11px] font-bold uppercase tracking-[0.22em] text-teal">{t("statusKicker")}</p>
          <h1 className="mt-3 text-center text-3xl font-extrabold tracking-tight text-navy sm:text-4xl">{t("statusTitle")}</h1>
          <p className="mx-auto mt-3 max-w-lg text-center text-sm leading-6 text-slate-600">{t("statusLead")}</p>

          <div className="mt-6">
            <StatusInstructions />
          </div>

          <div className="mt-5">
            <SectionCard>
              <Field label={t("statusId")} required hint={t("statusIdHint")}>
                <input
                  className={inputClass}
                  value={ticketId}
                  inputMode="numeric"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  pattern="[0-9]*"
                  maxLength={12}
                  onChange={(e) => setTicketId(formatPublicTicketIdInput(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") lookup();
                  }}
                  placeholder="101001"
                />
              </Field>
              <button
                type="button"
                onClick={lookup}
                disabled={busy}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-navy px-5 py-3 text-sm font-extrabold text-white disabled:opacity-60"
              >
                <Search className="h-4 w-4" />
                {t("statusLookup")}
              </button>
            </SectionCard>
          </div>

          {found ? (
            <>
              <div className="mt-5">
                <StatusBanner status={found.paymentStatus} />
              </div>

              <div className="mt-5">
                <SectionCard title={found.fullName} description={found.ticketId}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Review label={t("labelAge")} value={String(found.age)} />
                    <Review label={t("labelSex")} value={found.sex === "MALE" ? t("male") : t("female")} />
                    <Review label={t("labelPhone")} value={found.phone} />
                    <Review label={t("labelFacebook")} value={found.facebook} />
                    <Review label={t("labelCategory")} value={labelFor(AGE_CATEGORIES, found.ageCategory)} />
                    <Review label={t("labelChurch")} value={found.churchName} />
                    <Review label={t("labelSize")} value={labelFor(SANDO_SIZES, found.sandoSize)} />
                    <Review label={t("labelPayment")} value={`${found.packageLabel} — ₱${found.amount}`} />
                    <Review
                      label={t("labelPayType")}
                      value={
                        found.paymentMode === "CASH"
                          ? t("payCash")
                          : found.paymentMode === "PAY_LATER"
                            ? t("payLater")
                            : t("payOnline")
                      }
                    />
                    {found.paymentMode === "PAY_LATER" ? (
                      <>
                        <Review label={t("labelAmountPaid")} value={`₱${found.amountPaid ?? 0}`} />
                        <Review label={t("labelBalance")} value={`₱${found.balance ?? Math.max(0, found.amount - (found.amountPaid ?? 0))}`} />
                      </>
                    ) : null}
                    <Review
                      label={t("labelAttendance")}
                      value={found.attendedAt ? t("attendedYes") : t("attendedNo")}
                    />
                  </div>
                </SectionCard>
              </div>
            </>
          ) : null}

          {error ? (
            <p className="mt-5 rounded-2xl border border-orange/20 bg-orange/10 px-4 py-3 text-sm font-semibold text-orange">
              {error}
            </p>
          ) : null}
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}

function StatusBanner({ status }: { status: PaymentStatus }) {
  const { t } = useLanguage();

  if (status === "VALID") {
    return (
      <div className="rounded-[24px] border border-teal/25 bg-teal/10 px-5 py-6 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal text-white">
          <CheckCircle2 className="h-7 w-7" />
        </span>
        <h2 className="mt-4 text-xl font-extrabold text-navy sm:text-2xl">{t("statusApprovedTitle")}</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-navy/80">{t("statusApprovedBody")}</p>
      </div>
    );
  }

  if (status === "DENIED") {
    return (
      <div className="rounded-[24px] border border-red-200 bg-red-50 px-5 py-6 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-600 text-white">
          <TriangleAlert className="h-7 w-7" />
        </span>
        <h2 className="mt-4 text-xl font-extrabold text-navy sm:text-2xl">{t("statusDeniedTitle")}</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-navy/80">{t("statusDeniedBody")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-[24px] border border-orange/25 bg-orange/[0.08] px-5 py-6 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange text-white">
        <Clock3 className="h-7 w-7" />
      </span>
      <h2 className="mt-4 text-xl font-extrabold text-navy sm:text-2xl">{t("statusPendingTitle")}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-navy/80">{t("statusPendingBody")}</p>
    </div>
  );
}

function Review({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-sand/80 px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 break-words font-semibold text-navy">{value || "—"}</p>
    </div>
  );
}

const STATUS_STEPS = [
  { number: "1", title: "statusStep1Title", body: "statusStep1Body", icon: Search },
  { number: "2", title: "statusStep2Title", body: "statusStep2Body", icon: ListChecks },
  { number: "3", title: "statusStep3Title", body: "statusStep3Body", icon: Clock3 },
] as const satisfies ReadonlyArray<{
  number: string;
  title: TranslationKey;
  body: TranslationKey;
  icon: typeof Search;
}>;

function StatusInstructions() {
  const { t } = useLanguage();

  return (
    <SectionCard title={t("statusHowTitle")} description={t("statusHowLead")}>
      <ol className="space-y-3">
        {STATUS_STEPS.map((step) => {
          const Icon = step.icon;
          return (
            <li key={step.number} className="flex gap-3 rounded-2xl border border-slate-100 bg-sand/50 px-3 py-3 sm:px-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-navy text-white">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-teal">
                  {step.number}. {t(step.title)}
                </p>
                <p className="mt-1 text-sm leading-6 text-navy/80">{t(step.body)}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </SectionCard>
  );
}
