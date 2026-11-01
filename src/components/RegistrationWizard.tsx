"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, Clock3, MapPin, Search, Upload } from "lucide-react";
import { churchDisplayName, churchesInZone, OTHER_CHURCH_CODE } from "@/lib/churches";
import { AGE_CATEGORIES, MAX_PROOF_BYTES, PAYMENT_PACKAGES, SANDO_SIZES, STATUS_PATH, registrationPaymentBanner } from "@/lib/constants";
import { ChoiceCard, Field, PackageOptionCard, SectionCard, inputClass } from "./Field";
import { PaymentQrCodes } from "./PaymentQrCodes";
import { IntroModal } from "./IntroModal";
import { MigrationModal } from "./MigrationModal";
import { SubmitLoadingOverlay } from "./SubmitLoadingOverlay";
import { FormCountdownBar } from "./CountdownBar";
import { LanguageToggle, useLanguage } from "./LanguageProvider";
import { SiteFooter } from "./SiteFooter";
import type { TranslationKey } from "@/lib/i18n";
import { registrationErrorMessage, validateRegistrationInput } from "@/lib/validation";

type FormState = {
  fullName: string;
  age: string;
  sex: "MALE" | "FEMALE" | "";
  phone: string;
  facebook: string;
  ageCategory: string;
  zone: number | null;
  churchCode: string;
  sandoSize: string;
  paymentPackage: "DISCOUNTED" | "PREMIUM" | "REGULAR" | "";
  paymentMode: "FULL" | "CASH" | "PAY_LATER";
  proofFile: File | null;
};

const INITIAL: FormState = {
  fullName: "",
  age: "",
  sex: "",
  phone: "",
  facebook: "",
  ageCategory: "",
  zone: null,
  churchCode: "",
  sandoSize: "",
  paymentPackage: "",
  paymentMode: "FULL",
  proofFile: null,
};

const STEP_KEYS = ["stepPersonal", "stepSando", "stepPayment", "stepReview"] as const;
const AGE_KEYS: Record<string, TranslationKey> = {
  KIDS: "kids",
  YOUTH: "youth",
  YOUNG_ADULTS: "youngAdults",
  ADULTS: "adults",
  SENIOR: "senior",
};
const SINGLET_SIZES = SANDO_SIZES.filter((size) => size.id !== "NOT_APPLICABLE");

export function RegistrationWizard({ migrationUrl }: { migrationUrl?: string }) {
  const router = useRouter();
  const { t } = useLanguage();
  const migrated = Boolean(migrationUrl?.trim());
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [discountedVisible, setDiscountedVisible] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [pricingLoaded, setPricingLoaded] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [remainingCapSlots, setRemainingCapSlots] = useState(100);
  const [discountedEndsAt, setDiscountedEndsAt] = useState<string | null>(null);
  const [premiumEndsAt, setPremiumEndsAt] = useState<string | null>(null);
  const [regularEndsAt, setRegularEndsAt] = useState<string | null>(null);
  const [premiumOpenApi, setPremiumOpenApi] = useState(true);
  const [regularOpenApi, setRegularOpenApi] = useState(true);
  const [payLaterOpenApi, setPayLaterOpenApi] = useState(true);
  const [payLaterEndsAt, setPayLaterEndsAt] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    function loadPricing() {
      fetch("/api/pricing")
        .then((res) => res.json())
        .then((data) => {
          setDiscountedVisible(Boolean(data.discountedVisible));
          setRegistrationOpen(data.registrationOpen !== false);
          setRegistrationEnabled(data.registrationEnabled !== false);
          setRemainingCapSlots(Number(data.remainingVisibleSlots ?? data.remainingCapSlots ?? 0));
          setDiscountedEndsAt(data.discountedEndsAt ?? null);
          setPremiumEndsAt(data.premiumEndsAt ?? null);
          setRegularEndsAt(data.regularEndsAt ?? null);
          setPayLaterEndsAt(data.payLaterEndsAt ?? null);
          setPremiumOpenApi(data.premiumOpen !== false);
          setRegularOpenApi(data.regularOpen !== false);
          setPayLaterOpenApi(data.payLaterOpen !== false);
          setPricingLoaded((loaded) => {
            if (!loaded && !migrated && data.registrationOpen !== false) {
              setShowIntro(true);
            }
            return true;
          });
        })
        .catch(() => undefined);
    }
    loadPricing();
    const id = window.setInterval(loadPricing, 15000);
    return () => window.clearInterval(id);
  }, [step]);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const promoEndedByTimer = Boolean(discountedEndsAt && nowMs >= new Date(discountedEndsAt).getTime());
  const premiumEndedByTimer = Boolean(premiumEndsAt && nowMs >= new Date(premiumEndsAt).getTime());
  const regularEndedByTimer = Boolean(regularEndsAt && nowMs >= new Date(regularEndsAt).getTime());
  const payLaterEndedByTimer = Boolean(payLaterEndsAt && nowMs >= new Date(payLaterEndsAt).getTime());
  const showPremium = pricingLoaded && registrationEnabled && premiumOpenApi && !premiumEndedByTimer;
  const showRegular = pricingLoaded && registrationEnabled && regularOpenApi && !regularEndedByTimer;
  const showDiscounted =
    pricingLoaded &&
    registrationEnabled &&
    discountedVisible &&
    remainingCapSlots > 0 &&
    !promoEndedByTimer;
  const showPayLater = pricingLoaded && registrationEnabled && payLaterOpenApi && !payLaterEndedByTimer;
  const formOpen = pricingLoaded && registrationEnabled && (showDiscounted || showPremium || showRegular);
  const closedKind: "ended" | "notStarted" = registrationOpen || formOpen ? "notStarted" : "ended";

  useEffect(() => {
    if (!showDiscounted && form.paymentPackage === "DISCOUNTED") {
      setForm((prev) => ({ ...prev, paymentPackage: "", sandoSize: "" }));
      setStep(0);
    }
    if (!showPremium && form.paymentPackage === "PREMIUM") {
      setForm((prev) => ({ ...prev, paymentPackage: "", sandoSize: "" }));
      setStep(0);
    }
    if (!showRegular && form.paymentPackage === "REGULAR") {
      setForm((prev) => ({ ...prev, paymentPackage: "", sandoSize: "" }));
      setStep(0);
    }
    if (!showPayLater && form.paymentMode === "PAY_LATER") {
      setForm((prev) => ({ ...prev, paymentMode: "FULL", proofFile: null }));
    }
  }, [showDiscounted, showPremium, showRegular, showPayLater, form.paymentPackage, form.paymentMode]);

  const churches = useMemo(() => (form.zone ? churchesInZone(form.zone) : []), [form.zone]);
  const previewUrl = useMemo(
    () => (form.proofFile && form.proofFile.type.startsWith("image/") ? URL.createObjectURL(form.proofFile) : null),
    [form.proofFile],
  );
  const includesSinglet = form.paymentPackage === "DISCOUNTED" || form.paymentPackage === "PREMIUM";
  const selectedPackage = form.paymentPackage ? PAYMENT_PACKAGES[form.paymentPackage] : null;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError("");
  }

  function selectPackage(id: "DISCOUNTED" | "PREMIUM" | "REGULAR") {
    setForm((prev) => ({
      ...prev,
      paymentPackage: id,
      sandoSize: id === "REGULAR" ? "NOT_APPLICABLE" : prev.sandoSize === "NOT_APPLICABLE" ? "" : prev.sandoSize,
    }));
    setError("");
  }

  function validateStep() {
    if (step === 0) {
      if (!form.fullName.trim()) return t("errName");
      if (!form.age) return t("errAge");
      if (!/^\d+$/.test(form.age) || Number(form.age) < 5 || Number(form.age) > 120) return t("errAge");
      if (!form.sex) return t("errSex");
      if (!form.phone.trim()) return t("errPhone");
      if (!/^\d{7,15}$/.test(form.phone.trim())) return t("errPhone");
      if (!form.facebook.trim()) return t("errFacebook");
      if (!form.ageCategory) return t("errCategory");
      if (!form.churchCode) return t("errChurch");
      if (form.churchCode !== OTHER_CHURCH_CODE && !form.zone) return t("errZone");
      if (!form.paymentPackage) return t("errPackage");
      if (form.paymentPackage === "DISCOUNTED" && !showDiscounted) return t("errPackage");
      if (form.paymentPackage === "PREMIUM" && !showPremium) return t("errPackage");
      if (form.paymentPackage === "REGULAR" && !showRegular) return t("errPackage");
    }
    if (step === 1) {
      if (includesSinglet && (!form.sandoSize || form.sandoSize === "NOT_APPLICABLE")) return t("errSize");
    }
    if (step === 2) {
      if (!form.paymentPackage) return t("errPackage");
      if (!form.paymentMode) return t("errPayMethod");
      if (form.paymentMode === "PAY_LATER" && !showPayLater) return t("errPayMethod");
      if (form.paymentMode !== "PAY_LATER") {
        if (!form.proofFile) return t("errProof");
        if (form.proofFile.size > MAX_PROOF_BYTES) return t("errProofSize");
      }
    }
    if (step === 3) {
      return validateBeforeSubmit();
    }
    return "";
  }

  function validateBeforeSubmit() {
    if (form.paymentMode !== "PAY_LATER") {
      if (!form.proofFile) return t("errProof");
      if (form.proofFile.size > MAX_PROOF_BYTES) return t("errProofSize");
    }
    if (!form.paymentPackage || !form.sex) return t("errGeneric");

    const parsed = validateRegistrationInput(form);
    if (!parsed.success) {
      return mapRegistrationError(registrationErrorMessage(parsed.error));
    }
    return "";
  }

  function mapRegistrationError(message: string) {
    if (message.includes("contact number")) return t("errPhone");
    if (message.includes("Age must")) return t("errAge");
    if (message.includes("sando size") || message.includes("singlet")) return t("errSize");
    if (message.includes("Full name")) return t("errName");
    if (message.includes("already registered")) return t("errNameDuplicate");
    if (message.includes("Facebook")) return t("errFacebook");
    return message || t("errGeneric");
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }

  async function next() {
    const message = validateStep();
    if (message) {
      setError(message);
      return;
    }
    if (step === 0) {
      const taken = await isFullNameTaken(form.fullName);
      if (taken) {
        setError(t("errNameDuplicate"));
        return;
      }
    }
    setError("");
    setStep((s) => Math.min(s + 1, 3));
    scrollToTop();
  }

  async function isFullNameTaken(name: string) {
    try {
      const res = await fetch(`/api/register/name?fullName=${encodeURIComponent(name.trim())}`);
      const data = await res.json();
      return Boolean(data.taken);
    } catch {
      return false;
    }
  }

  async function submit() {
    if (migrated && migrationUrl) {
      window.location.assign(migrationUrl.replace(/\/$/, ""));
      return;
    }
    const message = validateBeforeSubmit();
    if (message) {
      setError(message);
      return;
    }
    if (!form.paymentPackage || !form.sex || !formOpen) return;
    if (form.paymentMode !== "PAY_LATER" && !form.proofFile) return;

    const taken = await isFullNameTaken(form.fullName);
    if (taken) {
      setError(t("errNameDuplicate"));
      return;
    }

    const sandoSize = form.paymentPackage === "REGULAR" ? "NOT_APPLICABLE" : form.sandoSize;
    setSubmitting(true);
    setError("");
    try {
      const payload = new FormData();
      payload.set("fullName", form.fullName);
      payload.set("age", form.age);
      payload.set("sex", form.sex);
      payload.set("phone", form.phone);
      payload.set("facebook", form.facebook);
      payload.set("ageCategory", form.ageCategory);
      if (form.zone) payload.set("zone", String(form.zone));
      payload.set("churchCode", form.churchCode);
      payload.set("sandoSize", sandoSize);
      payload.set("paymentPackage", form.paymentPackage);
      payload.set("paymentMode", form.paymentMode);
      if (form.proofFile && form.paymentMode !== "PAY_LATER") {
        payload.set("paymentProof", form.proofFile);
      }

      const res = await fetch("/api/register", { method: "POST", body: payload });
      const data = await res.json();
      if (!res.ok) {
        setError(mapRegistrationError(data.error || t("errGeneric")));
        setSubmitting(false);
        return;
      }
      router.push(`/success?id=${encodeURIComponent(data.ticketId)}`);
    } catch {
      setError(t("errGeneric"));
      setSubmitting(false);
    }
  }

  const selectedChurchLabel = churchDisplayName(form.churchCode);

  return (
    <div className="wave-bg min-h-dvh w-full">
      {migrated && migrationUrl ? <MigrationModal newUrl={migrationUrl} /> : null}
      <IntroModal open={!migrated && showIntro && formOpen} onClose={() => setShowIntro(false)} />
      <SubmitLoadingOverlay open={submitting} />
      <div className="overflow-x-hidden bg-white">
        <Image
          src="/images/formheader.png"
          alt="AGOS 2026 — Let's run as one. Register today."
          width={1920}
          height={480}
          className="block h-auto w-full object-contain"
          sizes="100vw"
          priority
        />
        {formOpen ? (
          <FormCountdownBar
            discountedVisible={showDiscounted}
            remainingCapSlots={remainingCapSlots}
            discountedEndsAt={discountedEndsAt}
            premiumOpen={showPremium}
            premiumEndsAt={premiumEndsAt}
            regularOpen={showRegular}
            regularEndsAt={regularEndsAt}
          />
        ) : null}
        <div className="w-full px-4 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-teal sm:tracking-[0.18em]">
                {t("hostedBy")}
              </p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-navy sm:text-4xl lg:text-5xl">
                {t("welcome")}
              </h1>
              {formOpen ? (
                <p className="mt-4 max-w-3xl rounded-lg bg-teal px-4 py-3 text-sm leading-6 text-white sm:text-base">
                  {t("tagline")}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-navy/80">
              <LanguageToggle />
              <span className="inline-flex items-center gap-2 rounded-full bg-navy px-3 py-2 text-white">
                <Calendar className="h-3.5 w-3.5 text-teal" />
                {t("date")}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-sand px-3 py-2">
                <MapPin className="h-3.5 w-3.5 text-orange" />
                {t("venueShort")}
              </span>
              <Link
                href={STATUS_PATH}
                className="inline-flex items-center gap-2 rounded-full bg-teal px-3 py-2 text-white"
              >
                <Search className="h-3.5 w-3.5" />
                {t("ticketStatusCta")}
              </Link>
            </div>
          </div>

          {!pricingLoaded ? (
            <div className="mt-8 overflow-hidden rounded-[32px] border border-navy/10 bg-white shadow-[0_18px_50px_-32px_rgba(0,51,102,0.55)]">
              <div className="h-40 animate-pulse bg-gradient-to-br from-navy-deep via-navy to-[#014f7a]" />
              <div className="space-y-3 px-6 py-8">
                <div className="mx-auto h-3 w-40 animate-pulse rounded-full bg-slate-200" />
                <div className="mx-auto h-6 w-64 animate-pulse rounded-full bg-slate-100" />
                <div className="mx-auto h-4 w-full max-w-md animate-pulse rounded-full bg-slate-100" />
              </div>
            </div>
          ) : !formOpen ? (
            <RegistrationClosedCard kind={closedKind} />
          ) : (
            <>
              <ol className="mt-8 grid grid-cols-4 gap-2">
                {STEP_KEYS.map((key, index) => {
                  const active = index === step;
                  const done = index < step;
                  return (
                    <li key={key} className="min-w-0">
                      <div className={`h-1.5 rounded-full ${active || done ? "bg-orange" : "bg-slate-200"}`} />
                      <div className="mt-3 flex items-center gap-2">
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${
                            active ? "bg-orange text-white" : done ? "bg-teal text-white" : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          {index + 1}
                        </span>
                        <span className={`truncate text-[11px] font-bold uppercase tracking-wide ${active ? "text-navy" : "text-slate-400"}`}>
                          {t(key)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ol>

              <div className="mt-8 space-y-5">
                {step === 0 && (
                  <>
                    <SectionCard title={t("runnerTitle")} description={t("runnerDesc")}>
                      <div className="grid gap-5 md:grid-cols-2">
                        <Field label={t("fullName")} required>
                          <input className={inputClass} value={form.fullName} onChange={(e) => update("fullName", e.target.value)} />
                        </Field>
                        <Field label={t("phone")} required>
                          <input
                            className={inputClass}
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={15}
                            value={form.phone}
                            onChange={(e) => update("phone", e.target.value.replace(/\D/g, ""))}
                          />
                        </Field>
                        <Field label={t("age")} required>
                          <input
                            className={inputClass}
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={3}
                            value={form.age}
                            onChange={(e) => update("age", e.target.value.replace(/\D/g, ""))}
                          />
                        </Field>
                        <Field label={t("sex")} required>
                          <div className="grid grid-cols-2 gap-2">
                            {(["MALE", "FEMALE"] as const).map((sex) => (
                              <ChoiceCard
                                key={sex}
                                selected={form.sex === sex}
                                onClick={() => update("sex", sex)}
                                title={sex === "MALE" ? t("male") : t("female")}
                              />
                            ))}
                          </div>
                        </Field>
                        <div className="md:col-span-2">
                          <Field label={t("facebook")} required hint={t("facebookHint")}>
                            <input className={inputClass} maxLength={500} value={form.facebook} onChange={(e) => update("facebook", e.target.value)} />
                          </Field>
                        </div>
                      </div>
                    </SectionCard>

                    <SectionCard title={t("categoryTitle")} description={t("categoryDesc")}>
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {AGE_CATEGORIES.map((category) => (
                          <ChoiceCard
                            key={category.id}
                            selected={form.ageCategory === category.id}
                            onClick={() => update("ageCategory", category.id)}
                            title={t(AGE_KEYS[category.id])}
                          />
                        ))}
                      </div>
                    </SectionCard>

                    <SectionCard title={t("churchTitle")} description={t("churchDesc")}>
                      <Field label={t("zone")} required>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          {[1, 2, 3].map((zone) => (
                            <ChoiceCard
                              key={zone}
                              selected={form.zone === zone}
                              onClick={() => {
                                setForm((prev) => ({
                                  ...prev,
                                  zone,
                                  churchCode: "",
                                }));
                                setError("");
                              }}
                              title={t("zoneN", { n: zone })}
                            />
                          ))}
                          <ChoiceCard
                            selected={form.churchCode === OTHER_CHURCH_CODE}
                            onClick={() => {
                              setForm((prev) => ({
                                ...prev,
                                zone: null,
                                churchCode: OTHER_CHURCH_CODE,
                              }));
                              setError("");
                            }}
                            title={t("guest")}
                          />
                        </div>
                      </Field>
                      {form.churchCode !== OTHER_CHURCH_CODE && (
                        <div className="mt-5">
                          <Field label={t("localChurch")} required>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                              {churches.map((church) => (
                                <ChoiceCard
                                  key={church.code}
                                  selected={form.churchCode === church.code}
                                  onClick={() => update("churchCode", church.code)}
                                  title={church.name}
                                />
                              ))}
                            </div>
                          </Field>
                          {!form.zone ? <p className="mt-2 text-xs text-slate-500">{t("selectZone")}</p> : null}
                        </div>
                      )}
                    </SectionCard>

                    <SectionCard title={t("packageTitle")} description={t("packageDesc")}>
                      <div className="grid gap-3">
                        {showDiscounted ? (
                          <PackageOptionCard
                            selected={form.paymentPackage === "DISCOUNTED"}
                            onClick={() => selectPackage("DISCOUNTED")}
                            amount={PAYMENT_PACKAGES.DISCOUNTED.amount}
                            name={t("discountedName")}
                            description={`${t("discountedDesc")} ${t("slotsLeft", { n: remainingCapSlots })}`}
                            iconSrc={PAYMENT_PACKAGES.DISCOUNTED.icon}
                            iconAlt={t("discountedName")}
                          />
                        ) : null}
                        {showPremium ? (
                          <PackageOptionCard
                            selected={form.paymentPackage === "PREMIUM"}
                            onClick={() => selectPackage("PREMIUM")}
                            amount={PAYMENT_PACKAGES.PREMIUM.amount}
                            name={t("premiumName")}
                            description={t("premiumDesc")}
                            iconSrc={PAYMENT_PACKAGES.PREMIUM.icon}
                            iconAlt={t("premiumName")}
                          />
                        ) : null}
                        {showRegular ? (
                          <PackageOptionCard
                            selected={form.paymentPackage === "REGULAR"}
                            onClick={() => selectPackage("REGULAR")}
                            amount={PAYMENT_PACKAGES.REGULAR.amount}
                            name={t("regularName")}
                            description={t("regularDesc")}
                            iconSrc={PAYMENT_PACKAGES.REGULAR.icon}
                            iconAlt={t("regularName")}
                          />
                        ) : null}
                      </div>
                    </SectionCard>
                  </>
                )}

                {step === 1 && (
                  <SectionCard
                    title={t("sandoTitle")}
                    description={includesSinglet ? t("sandoDescSinglet") : t("sandoDescRegular")}
                  >
                    <div className="overflow-hidden rounded-[24px] border border-slate-100 bg-white">
                      <Image
                        src="/images/tshirtdesign.png"
                        alt={t("officialSinglet")}
                        width={1600}
                        height={900}
                        className="h-auto w-full object-contain"
                        priority
                      />
                    </div>
                    <p className="mt-3 text-center text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                      {t("officialSinglet")}
                    </p>
                    {includesSinglet ? (
                      <>
                        <div className="mt-5 overflow-hidden rounded-[24px] border border-slate-100 bg-sand">
                          <Image src="/images/tshirtguide.png" alt={t("size")} width={1400} height={900} className="h-auto w-full" />
                        </div>
                        <div className="mt-5">
                          <Field label={t("size")} required>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                              {SINGLET_SIZES.map((size) => (
                                <ChoiceCard
                                  key={size.id}
                                  selected={form.sandoSize === size.id}
                                  onClick={() => update("sandoSize", size.id)}
                                  title={size.label}
                                />
                              ))}
                            </div>
                          </Field>
                        </div>
                      </>
                    ) : null}
                  </SectionCard>
                )}

                {step === 2 && selectedPackage && (
                  <SectionCard title={t("paymentTitle")} description={t("paymentDesc")}>
                    <div className="overflow-hidden rounded-[24px] border border-slate-100">
                      <Image
                        src={registrationPaymentBanner(form.paymentPackage as "DISCOUNTED" | "PREMIUM" | "REGULAR")}
                        alt={selectedPackage.shortLabel}
                        width={1200}
                        height={700}
                        className="h-auto w-full object-contain"
                        priority
                      />
                    </div>
                    <p className="mt-5 rounded-2xl bg-sand px-4 py-3 text-sm font-semibold text-navy">
                      {form.paymentMode === "PAY_LATER"
                        ? `${t("payLater")} — ₱${selectedPackage.amount}`
                        : t("payNow", { n: selectedPackage.amount })}
                    </p>
                    <div className="mt-5">
                      <Field label={t("payMethodTitle")} required>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          <ChoiceCard
                            selected={form.paymentMode === "FULL"}
                            onClick={() => update("paymentMode", "FULL")}
                            title={t("payOnline")}
                            subtitle={t("payOnlineDesc")}
                          />
                          <ChoiceCard
                            selected={form.paymentMode === "CASH"}
                            onClick={() => update("paymentMode", "CASH")}
                            title={t("payCash")}
                            subtitle={t("payCashDesc")}
                          />
                          {showPayLater ? (
                            <ChoiceCard
                              selected={form.paymentMode === "PAY_LATER"}
                              onClick={() => {
                                setForm((prev) => ({ ...prev, paymentMode: "PAY_LATER", proofFile: null }));
                                setError("");
                              }}
                              title={t("payLater")}
                              subtitle={t("payLaterDesc")}
                            />
                          ) : null}
                        </div>
                      </Field>
                    </div>
                    {form.paymentMode === "CASH" ? (
                      <div className="mt-5 rounded-2xl border border-orange/20 bg-orange/[0.07] px-4 py-4">
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-orange">
                          {t("payCashNoteTitle")}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-navy/80">{t("payCashNote")}</p>
                      </div>
                    ) : form.paymentMode === "PAY_LATER" ? (
                      <div className="mt-5 rounded-2xl border border-orange/20 bg-orange/[0.07] px-4 py-4">
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-orange">
                          {t("payLaterNoteTitle")}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-navy/80">{t("payLaterNote")}</p>
                      </div>
                    ) : (
                      <div className="mt-5">
                        <PaymentQrCodes />
                      </div>
                    )}
                    {form.paymentMode !== "PAY_LATER" ? (
                      <div className="mt-5">
                        <label className="flex cursor-pointer flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-teal/30 bg-teal/[0.04] px-6 py-10 text-center transition [touch-action:pan-y] hover:border-teal hover:bg-teal/[0.07]">
                          <Upload className="h-8 w-8 text-teal" />
                          <span className="mt-3 text-sm font-bold text-navy">{t("uploadCta")}</span>
                          <span className="mt-1 text-xs text-slate-500">{t("uploadHint")}</span>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            className="sr-only"
                            onChange={(e) => update("proofFile", e.target.files?.[0] ?? null)}
                          />
                        </label>
                        {previewUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={previewUrl} alt="Proof preview" className="mt-4 max-h-56 w-full rounded-2xl object-contain" />
                        ) : form.proofFile ? (
                          <p className="mt-4 text-sm font-medium text-navy">{form.proofFile.name}</p>
                        ) : null}
                      </div>
                    ) : null}
                  </SectionCard>
                )}

                {step === 3 && (
                  <SectionCard title={t("reviewTitle")} description={t("reviewDesc")}>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <ReviewRow label={t("labelFullName")} value={form.fullName} />
                      <ReviewRow label={t("labelAge")} value={form.age} />
                      <ReviewRow label={t("labelSex")} value={form.sex === "MALE" ? t("male") : t("female")} />
                      <ReviewRow label={t("labelPhone")} value={form.phone} />
                      <ReviewRow label={t("labelFacebook")} value={form.facebook} />
                      <ReviewRow
                        label={t("labelCategory")}
                        value={form.ageCategory ? t(AGE_KEYS[form.ageCategory]) : ""}
                      />
                      <ReviewRow
                        label={t("labelZone")}
                        value={form.zone ? t("zoneN", { n: form.zone }) : form.churchCode === OTHER_CHURCH_CODE ? t("guest") : "—"}
                      />
                      <ReviewRow
                        label={t("labelChurch")}
                        value={form.churchCode === OTHER_CHURCH_CODE ? t("guest") : selectedChurchLabel}
                      />
                      <ReviewRow
                        label={t("labelSize")}
                        value={SANDO_SIZES.find((s) => s.id === form.sandoSize)?.label ?? ""}
                      />
                      <ReviewRow
                        label={t("labelPayment")}
                        value={form.paymentPackage ? PAYMENT_PACKAGES[form.paymentPackage].shortLabel : ""}
                      />
                      <ReviewRow
                        label={t("labelPayType")}
                        value={
                          form.paymentMode === "CASH"
                            ? t("payCash")
                            : form.paymentMode === "PAY_LATER"
                              ? t("payLater")
                              : t("payOnline")
                        }
                      />
                      <ReviewRow
                        label={t("labelPayNow")}
                        value={selectedPackage ? `₱${selectedPackage.amount}` : ""}
                      />
                      {form.paymentMode !== "PAY_LATER" ? (
                        <ReviewRow label={t("labelProof")} value={form.proofFile?.name ?? ""} />
                      ) : (
                        <ReviewRow label={t("labelAmountPaid")} value="₱0" />
                      )}
                    </div>
                    {previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={previewUrl} alt="Proof preview" className="mt-5 max-h-48 rounded-2xl object-contain" />
                    ) : null}
                  </SectionCard>
                )}
              </div>

              {error ? (
                <p className="mt-5 rounded-2xl border border-orange/20 bg-orange/10 px-4 py-3 text-sm font-semibold text-orange">
                  {error}
                </p>
              ) : null}

              <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-100 pt-6">
                {step > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      setStep((s) => s - 1);
                      scrollToTop();
                    }}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-navy"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    {t("back")}
                  </button>
                ) : (
                  <span />
                )}
                {step < 3 ? (
                  <button
                    type="button"
                    onClick={next}
                    className="inline-flex items-center gap-1 rounded-full bg-orange px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-orange/30"
                  >
                    {t("next")}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={submit}
                    disabled={submitting}
                    className="rounded-full bg-orange px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-orange/30 disabled:opacity-60"
                  >
                    {t("submit")}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-sand/80 px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 break-words font-semibold text-navy">{value || "—"}</p>
    </div>
  );
}

function RegistrationClosedCard({ kind }: { kind: "ended" | "notStarted" }) {
  const { t } = useLanguage();
  const ended = kind === "ended";

  return (
    <div className="mt-8 overflow-hidden rounded-[32px] border border-navy/10 bg-white shadow-[0_18px_50px_-32px_rgba(0,51,102,0.55)]">
      <div className="relative overflow-hidden bg-gradient-to-br from-navy-deep via-navy to-[#014f7a] px-6 py-10 text-center text-white sm:px-10 sm:py-12">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-teal/30 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 left-10 h-32 w-32 rounded-full bg-orange/25 blur-2xl" />
        <div className="relative">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
            <Clock3 className="h-7 w-7 text-teal" />
          </span>
          <p className="mt-5 text-[11px] font-extrabold uppercase tracking-[0.22em] text-orange">
            {ended ? t("closedKicker") : t("notStartedKicker")}
          </p>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
            {ended ? t("closedTitle") : t("notStartedTitle")}
          </h2>
        </div>
      </div>
      <div className="px-6 py-8 text-center sm:px-10">
        <p className="mx-auto max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
          {ended ? t("closedBody") : t("notStartedBody")}
        </p>
      </div>
    </div>
  );
}
