import type { ReactNode } from "react";
import { Check } from "lucide-react";

export function Field({
  label,
  required,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="block space-y-2.5">
      <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-navy/70">
        {label}
        {required ? <span className="text-orange"> *</span> : null}
      </span>
      {children}
      {hint ? <span className="block text-xs text-slate-500">{hint}</span> : null}
    </div>
  );
}

export const inputClass =
  "w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3.5 text-sm font-medium text-navy shadow-[0_8px_24px_-18px_rgba(0,51,102,0.45)] outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-teal focus:ring-4 focus:ring-teal/15";

export function ChoiceCard({
  selected,
  onClick,
  title,
  subtitle,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition [touch-action:pan-y] ${
        selected
          ? "border-orange bg-orange/[0.08] shadow-[0_10px_30px_-18px_rgba(255,143,0,0.9)] ring-2 ring-orange/20"
          : "border-slate-200/80 bg-white sm:hover:-translate-y-0.5 hover:border-teal/40 hover:shadow-[0_12px_30px_-20px_rgba(0,51,102,0.45)]"
      }`}
    >
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
          selected ? "border-orange bg-orange text-white" : "border-slate-300 bg-white text-transparent"
        }`}
      >
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-navy">{title}</span>
        {subtitle ? <span className="mt-1 block text-xs leading-5 text-slate-500">{subtitle}</span> : null}
        {children}
      </span>
    </button>
  );
}

export function PackageOptionCard({
  selected,
  onClick,
  amount,
  name,
  description,
  iconSrc,
  iconAlt,
}: {
  selected: boolean;
  onClick: () => void;
  amount: number;
  name: string;
  description: string;
  iconSrc: string;
  iconAlt: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-[24px] border bg-white px-4 py-3.5 text-left transition [touch-action:pan-y] sm:gap-4 sm:px-5 ${
        selected
          ? "border-orange shadow-[0_10px_30px_-18px_rgba(255,143,0,0.9)] ring-2 ring-orange/20"
          : "border-slate-200/80 hover:border-teal/40 hover:shadow-[0_12px_30px_-20px_rgba(0,51,102,0.45)]"
      }`}
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
          selected ? "border-orange bg-orange text-white" : "border-slate-300 bg-white text-transparent"
        }`}
      >
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-xl font-extrabold text-teal sm:text-2xl">₱{amount}</span>
          <span className="text-base font-extrabold text-navy sm:text-lg">{name}</span>
        </span>
        <span className="mt-1 block text-xs leading-5 text-slate-500 sm:text-sm">{description}</span>
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={iconSrc} alt={iconAlt} className="h-14 w-14 shrink-0 object-contain sm:h-16 sm:w-16" />
    </button>
  );
}

export function SectionCard({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-white/80 bg-white p-4 shadow-[0_18px_50px_-32px_rgba(0,51,102,0.55)] sm:p-6">
      {title ? <h2 className="text-lg font-extrabold tracking-tight text-navy">{title}</h2> : null}
      {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      <div className={title ? "mt-5" : ""}>{children}</div>
    </section>
  );
}
