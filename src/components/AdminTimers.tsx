"use client";

import { useEffect, useState } from "react";
import { CountdownDigits } from "./CountdownBar";
import { inputClass } from "./Field";

type OptionStatus = "Active" | "ExpiringSoon" | "Expired" | "ManuallyDisabled";

type Settings = {
  discountedEndsAt: string | null;
  registrationEndsAt: string | null;
  premiumEndsAt: string | null;
  regularEndsAt: string | null;
  payLaterEndsAt: string | null;
  discountedEndsAtLocal: string;
  registrationEndsAtLocal: string;
  premiumEndsAtLocal: string;
  regularEndsAtLocal: string;
  payLaterEndsAtLocal: string;
  discountedVisible: boolean;
  registrationOpen: boolean;
  registrationEnabled: boolean;
  discountedEnabled: boolean;
  premiumOpen: boolean;
  premiumEnabled: boolean;
  regularOpen: boolean;
  regularEnabled: boolean;
  payLaterOpen: boolean;
  payLaterEnabled: boolean;
  remainingCapSlots: number;
  remainingVisibleSlots: number;
  discountedStatus: OptionStatus;
  premiumStatus: OptionStatus;
  regularStatus: OptionStatus;
  payLaterStatus: OptionStatus;
};

function statusTone(status: OptionStatus) {
  if (status === "Active") return "bg-teal/15 text-teal";
  if (status === "ExpiringSoon") return "bg-orange/15 text-orange";
  if (status === "Expired") return "bg-slate-200 text-slate-600";
  return "bg-red-100 text-red-700";
}

function statusLabel(status: OptionStatus) {
  if (status === "ExpiringSoon") return "Expiring Soon";
  if (status === "ManuallyDisabled") return "Manually Disabled";
  return status;
}

function StatusPill({ status }: { status: OptionStatus }) {
  return (
    <span className={`rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] ${statusTone(status)}`}>
      {statusLabel(status)}
    </span>
  );
}

export function AdminTimers() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [discountedEndsAtLocal, setDiscountedEndsAtLocal] = useState("");
  const [premiumEndsAtLocal, setPremiumEndsAtLocal] = useState("");
  const [regularEndsAtLocal, setRegularEndsAtLocal] = useState("");
  const [payLaterEndsAtLocal, setPayLaterEndsAtLocal] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data: Settings) => {
        setSettings(data);
        setDiscountedEndsAtLocal(data.discountedEndsAtLocal ?? "");
        setPremiumEndsAtLocal(data.premiumEndsAtLocal ?? "");
        setRegularEndsAtLocal(data.regularEndsAtLocal ?? "");
        setPayLaterEndsAtLocal(data.payLaterEndsAtLocal ?? "");
      })
      .catch(() => undefined);
  }, []);

  async function send(body: Record<string, string>) {
    setBusy(body.action ?? "save");
    setMessage("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Could not update.");
        return;
      }
      setSettings(data);
      setDiscountedEndsAtLocal(data.discountedEndsAtLocal ?? "");
      setPremiumEndsAtLocal(data.premiumEndsAtLocal ?? "");
      setRegularEndsAtLocal(data.regularEndsAtLocal ?? "");
      setPayLaterEndsAtLocal(data.payLaterEndsAtLocal ?? "");
      setMessage("Updated. The public form follows this immediately.");
    } catch {
      setMessage("Could not update.");
    } finally {
      setBusy("");
    }
  }

  if (!settings) {
    return <p className="px-4 py-6 text-sm text-slate-500">Loading schedule...</p>;
  }

  return (
    <div>
      <div className="flex flex-col gap-4 border-b border-slate-200/70 bg-white px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <h2 className="text-2xl font-extrabold text-navy">Registration controls</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Manage ₱550 and ₱350 independently. Closing one option never closes the other. Save deadlines in Manila time,
            then reopen or disable each option as needed.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            send({
              action: "save",
              discountedEndsAtLocal,
              premiumEndsAtLocal,
              regularEndsAtLocal,
              payLaterEndsAtLocal,
            })
          }
          disabled={Boolean(busy)}
          className="inline-flex items-center rounded-full bg-navy px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60"
        >
          {busy === "save" ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {message ? (
        <p className="border-b border-slate-200/70 bg-teal/10 px-4 py-3 text-sm font-semibold text-navy sm:px-5">
          {message}
        </p>
      ) : null}

      <div className="grid border-b border-slate-200/70 lg:grid-cols-2">
        <section className="border-b border-slate-200/70 bg-white p-4 sm:p-5 lg:border-b-0 lg:border-r">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">₱550 Registration</p>
              <h3 className="mt-1 font-extrabold text-navy">Premium window</h3>
            </div>
            <StatusPill status={settings.premiumStatus} />
          </div>
          <p className="text-sm text-slate-500">
            {settings.premiumOpen
              ? "Premium ₱550 is accepting registrations."
              : "Premium ₱550 is unavailable. Reopen or extend the deadline to accept it again."}
          </p>
          <label className="mt-5 block">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-navy/70">Deadline (Manila)</span>
            <input
              type="datetime-local"
              value={premiumEndsAtLocal}
              onChange={(e) => setPremiumEndsAtLocal(e.target.value)}
              className={`${inputClass} mt-2`}
            />
          </label>
          <div className="mt-4">
            <CountdownDigits targetIso={settings.premiumEndsAt} tone="light" />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => send({ action: "reopenPremium" })}
              disabled={Boolean(busy) || settings.premiumOpen}
              className="rounded-full bg-teal px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy === "reopenPremium" ? "Reopening..." : "Enable ₱550"}
            </button>
            <button
              type="button"
              onClick={() => send({ action: "closePremium" })}
              disabled={Boolean(busy) || !settings.premiumEnabled}
              className="rounded-full bg-orange px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy === "closePremium" ? "Disabling..." : "Disable ₱550"}
            </button>
          </div>
        </section>

        <section className="bg-white p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">₱350 Registration</p>
              <h3 className="mt-1 font-extrabold text-navy">Regular window</h3>
            </div>
            <StatusPill status={settings.regularStatus} />
          </div>
          <p className="text-sm text-slate-500">
            {settings.regularOpen
              ? "Regular ₱350 is accepting registrations, including walk-ins until its own deadline."
              : "Regular ₱350 is unavailable. Reopen or extend the deadline to accept it again."}
          </p>
          <label className="mt-5 block">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-navy/70">Deadline (Manila)</span>
            <input
              type="datetime-local"
              value={regularEndsAtLocal}
              onChange={(e) => setRegularEndsAtLocal(e.target.value)}
              className={`${inputClass} mt-2`}
            />
          </label>
          <div className="mt-4">
            <CountdownDigits targetIso={settings.regularEndsAt} tone="light" />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => send({ action: "reopenRegular" })}
              disabled={Boolean(busy) || settings.regularOpen}
              className="rounded-full bg-teal px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy === "reopenRegular" ? "Reopening..." : "Enable ₱350"}
            </button>
            <button
              type="button"
              onClick={() => send({ action: "closeRegular" })}
              disabled={Boolean(busy) || !settings.regularEnabled}
              className="rounded-full bg-orange px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy === "closeRegular" ? "Disabling..." : "Disable ₱350"}
            </button>
          </div>
        </section>
      </div>

      <div className="grid border-b border-slate-200/70 lg:grid-cols-2">
        <section className="border-b border-slate-200/70 bg-white p-4 sm:p-5 lg:border-b-0 lg:border-r">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">₱500 Discounted promo</p>
              <h3 className="mt-1 font-extrabold text-navy">Promo window</h3>
            </div>
            <StatusPill status={settings.discountedStatus} />
          </div>
          <p className="text-sm text-slate-500">
            {settings.discountedVisible
              ? `${settings.remainingCapSlots} of 100 slots still open.`
              : settings.remainingCapSlots <= 0
                ? "Hidden because 100 of 100 slots are used."
                : "Hidden on the form. Reopen to show ₱500 again."}
          </p>
          <label className="mt-5 block">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-navy/70">Auto-hide date (Manila)</span>
            <input
              type="datetime-local"
              value={discountedEndsAtLocal}
              onChange={(e) => setDiscountedEndsAtLocal(e.target.value)}
              className={`${inputClass} mt-2`}
            />
          </label>
          <div className="mt-4">
            <CountdownDigits targetIso={settings.discountedEndsAt} tone="light" />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => send({ action: "reopenPromo" })}
              disabled={Boolean(busy) || settings.discountedVisible || settings.remainingCapSlots <= 0}
              className="rounded-full bg-teal px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy === "reopenPromo" ? "Reopening..." : "Reopen promo"}
            </button>
            <button
              type="button"
              onClick={() => send({ action: "closePromo" })}
              disabled={Boolean(busy) || !settings.discountedVisible}
              className="rounded-full bg-orange px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy === "closePromo" ? "Closing..." : "Hide promo now"}
            </button>
          </div>
        </section>

        <section className="bg-white p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Pay Later arrangement</p>
              <h3 className="mt-1 font-extrabold text-navy">New Pay Later cutoff</h3>
            </div>
            <StatusPill status={settings.payLaterStatus} />
          </div>
          <p className="text-sm text-slate-500">
            {settings.payLaterOpen
              ? "Registrants can choose Pay Later until this deadline."
              : "New Pay Later arrangements are closed. Existing balances can still be updated in the Pay Later list."}
          </p>
          <label className="mt-5 block">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-navy/70">Deadline (Manila)</span>
            <input
              type="datetime-local"
              value={payLaterEndsAtLocal}
              onChange={(e) => setPayLaterEndsAtLocal(e.target.value)}
              className={`${inputClass} mt-2`}
            />
          </label>
          <div className="mt-4">
            <CountdownDigits targetIso={settings.payLaterEndsAt} tone="light" />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => send({ action: "reopenPayLater" })}
              disabled={Boolean(busy) || settings.payLaterOpen}
              className="rounded-full bg-teal px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy === "reopenPayLater" ? "Reopening..." : "Enable Pay Later"}
            </button>
            <button
              type="button"
              onClick={() => send({ action: "closePayLater" })}
              disabled={Boolean(busy) || !settings.payLaterEnabled}
              className="rounded-full bg-orange px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy === "closePayLater" ? "Disabling..." : "Disable Pay Later"}
            </button>
          </div>
        </section>
      </div>

      <div className="border-b border-slate-200/70 bg-sand/50 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Master registration switch</p>
            <p className="mt-1 text-sm text-slate-600">
              {settings.registrationEnabled
                ? settings.registrationOpen
                  ? "Registration is open because at least one package option is available."
                  : "Master switch is on, but every package option is currently closed."
                : "Master switch is off. The public form rejects all new registrations."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => send({ action: "reopenRegistration" })}
              disabled={Boolean(busy) || settings.registrationEnabled}
              className="rounded-full bg-teal px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy === "reopenRegistration" ? "Reopening..." : "Turn master on"}
            </button>
            <button
              type="button"
              onClick={() => send({ action: "closeRegistration" })}
              disabled={Boolean(busy) || !settings.registrationEnabled}
              className="rounded-full bg-orange px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy === "closeRegistration" ? "Closing..." : "Turn master off"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
