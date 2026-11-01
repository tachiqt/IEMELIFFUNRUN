import { prisma } from "@/lib/prisma";
import { EARLY_BIRD_CAP, EARLY_BIRD_HIDE_AT } from "@/lib/constants";

export const SETTINGS_ID = "default";
export const MANILA_OFFSET = "+08:00";
export const EXPIRING_SOON_MS = 72 * 60 * 60 * 1000;

export type OptionStatus = "Active" | "ExpiringSoon" | "Expired" | "ManuallyDisabled";

export async function getEventSettings() {
  const existing = await prisma.eventSettings.findUnique({ where: { id: SETTINGS_ID } });
  if (existing) return existing;
  return prisma.eventSettings.create({
    data: {
      id: SETTINGS_ID,
      discountedEnabled: true,
      registrationEnabled: true,
      premiumEnabled: true,
      regularEnabled: true,
      payLaterEnabled: true,
      premiumEndsAt: new Date("2026-11-14T23:59:00+08:00"),
      regularEndsAt: new Date("2026-11-30T23:59:00+08:00"),
      payLaterEndsAt: new Date("2026-11-14T23:59:00+08:00"),
    },
  });
}

export function isPast(date: Date | null | undefined, now = new Date()) {
  return Boolean(date && now.getTime() >= date.getTime());
}

export function optionStatus(
  enabled: boolean,
  endsAt: Date | null | undefined,
  now = new Date(),
): OptionStatus {
  if (!enabled) return "ManuallyDisabled";
  if (isPast(endsAt, now)) return "Expired";
  if (endsAt && endsAt.getTime() - now.getTime() <= EXPIRING_SOON_MS) return "ExpiringSoon";
  return "Active";
}

export function isPackageWindowOpen(
  settings: { enabled: boolean; endsAt: Date | null },
  now = new Date(),
) {
  return settings.enabled && !isPast(settings.endsAt, now);
}

/** @deprecated Prefer package-specific windows; kept as master kill-switch helper. */
export function isRegistrationWindowOpen(
  settings: { registrationEnabled: boolean },
  now = new Date(),
) {
  void now;
  return settings.registrationEnabled;
}

export function isDiscountedWindowOpen(
  settings: { discountedEnabled: boolean; discountedEndsAt: Date | null },
  now = new Date(),
) {
  return isPackageWindowOpen(
    { enabled: settings.discountedEnabled, endsAt: settings.discountedEndsAt },
    now,
  );
}

export function isPremiumWindowOpen(
  settings: { premiumEnabled: boolean; premiumEndsAt: Date | null },
  now = new Date(),
) {
  return isPackageWindowOpen({ enabled: settings.premiumEnabled, endsAt: settings.premiumEndsAt }, now);
}

export function isRegularWindowOpen(
  settings: { regularEnabled: boolean; regularEndsAt: Date | null },
  now = new Date(),
) {
  return isPackageWindowOpen({ enabled: settings.regularEnabled, endsAt: settings.regularEndsAt }, now);
}

export function isPayLaterWindowOpen(
  settings: { payLaterEnabled: boolean; payLaterEndsAt: Date | null },
  now = new Date(),
) {
  return isPackageWindowOpen({ enabled: settings.payLaterEnabled, endsAt: settings.payLaterEndsAt }, now);
}

export function toDatetimeLocal(date: Date | null | undefined) {
  if (!date) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
}

export function fromDatetimeLocal(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  const date = new Date(`${trimmed}:00${MANILA_OFFSET}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function getRegistrationStatus(now = new Date()) {
  const [count, settings] = await Promise.all([prisma.registration.count(), getEventSettings()]);

  const discountedByTime = isDiscountedWindowOpen(settings, now);
  const premiumOpen = isPremiumWindowOpen(settings, now);
  const regularOpen = isRegularWindowOpen(settings, now);
  const payLaterOpen = isPayLaterWindowOpen(settings, now);
  const discountedAvailable =
    settings.registrationEnabled && discountedByTime && count < EARLY_BIRD_HIDE_AT;
  const discountedVisible = discountedAvailable;
  const anyPackageOpen = discountedAvailable || premiumOpen || regularOpen;
  const registrationOpen = settings.registrationEnabled && anyPackageOpen;

  return {
    now: now.toISOString(),
    count,
    registrationOpen,
    registrationEnabled: settings.registrationEnabled,
    discountedVisible,
    discountedAvailable,
    discountedEnabled: settings.discountedEnabled,
    premiumOpen,
    premiumEnabled: settings.premiumEnabled,
    regularOpen,
    regularEnabled: settings.regularEnabled,
    payLaterOpen,
    payLaterEnabled: settings.payLaterEnabled,
    remainingVisibleSlots: Math.max(0, EARLY_BIRD_HIDE_AT - count),
    remainingCapSlots: Math.max(0, EARLY_BIRD_HIDE_AT - count),
    remainingHardCapSlots: Math.max(0, EARLY_BIRD_CAP - count),
    discountedEndsAt: settings.discountedEndsAt?.toISOString() ?? null,
    registrationEndsAt: settings.registrationEndsAt?.toISOString() ?? null,
    premiumEndsAt: settings.premiumEndsAt?.toISOString() ?? null,
    regularEndsAt: settings.regularEndsAt?.toISOString() ?? null,
    payLaterEndsAt: settings.payLaterEndsAt?.toISOString() ?? null,
    discountedStatus: optionStatus(settings.discountedEnabled, settings.discountedEndsAt, now),
    premiumStatus: optionStatus(settings.premiumEnabled, settings.premiumEndsAt, now),
    regularStatus: optionStatus(settings.regularEnabled, settings.regularEndsAt, now),
    payLaterStatus: optionStatus(settings.payLaterEnabled, settings.payLaterEndsAt, now),
  };
}

export type RegistrationStatus = Awaited<ReturnType<typeof getRegistrationStatus>>;
