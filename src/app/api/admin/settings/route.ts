import { NextResponse } from "next/server";
import {
  fromDatetimeLocal,
  getEventSettings,
  getRegistrationStatus,
  isPast,
  SETTINGS_ID,
  toDatetimeLocal,
} from "@/lib/event-settings";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function payload(
  settings: Awaited<ReturnType<typeof getEventSettings>>,
  status: Awaited<ReturnType<typeof getRegistrationStatus>>,
) {
  return {
    ...status,
    discountedEndsAtLocal: toDatetimeLocal(settings.discountedEndsAt),
    registrationEndsAtLocal: toDatetimeLocal(settings.registrationEndsAt),
    premiumEndsAtLocal: toDatetimeLocal(settings.premiumEndsAt),
    regularEndsAtLocal: toDatetimeLocal(settings.regularEndsAt),
    payLaterEndsAtLocal: toDatetimeLocal(settings.payLaterEndsAt),
  };
}

export async function GET() {
  const [settings, status] = await Promise.all([getEventSettings(), getRegistrationStatus()]);
  return NextResponse.json(payload(settings, status));
}

type SettingsAction =
  | "save"
  | "reopenPromo"
  | "closePromo"
  | "reopenPremium"
  | "closePremium"
  | "reopenRegular"
  | "closeRegular"
  | "reopenPayLater"
  | "closePayLater"
  | "reopenRegistration"
  | "closeRegistration";

export async function PATCH(request: Request) {
  const body = (await request.json()) as {
    action?: SettingsAction;
    discountedEndsAtLocal?: string;
    registrationEndsAtLocal?: string;
    premiumEndsAtLocal?: string;
    regularEndsAtLocal?: string;
    payLaterEndsAtLocal?: string;
  };

  const current = await getEventSettings();
  const now = new Date();
  let discountedEndsAt = current.discountedEndsAt;
  let registrationEndsAt = current.registrationEndsAt;
  let premiumEndsAt = current.premiumEndsAt;
  let regularEndsAt = current.regularEndsAt;
  let payLaterEndsAt = current.payLaterEndsAt;
  let discountedEnabled = current.discountedEnabled;
  let registrationEnabled = current.registrationEnabled;
  let premiumEnabled = current.premiumEnabled;
  let regularEnabled = current.regularEnabled;
  let payLaterEnabled = current.payLaterEnabled;

  if (body.action === "closePromo") {
    discountedEnabled = false;
  } else if (body.action === "reopenPromo") {
    discountedEnabled = true;
    if (isPast(discountedEndsAt, now)) discountedEndsAt = null;
  } else if (body.action === "closePremium") {
    premiumEnabled = false;
  } else if (body.action === "reopenPremium") {
    premiumEnabled = true;
    if (isPast(premiumEndsAt, now)) premiumEndsAt = null;
  } else if (body.action === "closeRegular") {
    regularEnabled = false;
  } else if (body.action === "reopenRegular") {
    regularEnabled = true;
    if (isPast(regularEndsAt, now)) regularEndsAt = null;
  } else if (body.action === "closePayLater") {
    payLaterEnabled = false;
  } else if (body.action === "reopenPayLater") {
    payLaterEnabled = true;
    if (isPast(payLaterEndsAt, now)) payLaterEndsAt = null;
  } else if (body.action === "closeRegistration") {
    registrationEnabled = false;
  } else if (body.action === "reopenRegistration") {
    registrationEnabled = true;
  } else {
    discountedEndsAt = fromDatetimeLocal(body.discountedEndsAtLocal);
    registrationEndsAt = fromDatetimeLocal(body.registrationEndsAtLocal);
    premiumEndsAt = fromDatetimeLocal(body.premiumEndsAtLocal);
    regularEndsAt = fromDatetimeLocal(body.regularEndsAtLocal);
    payLaterEndsAt = fromDatetimeLocal(body.payLaterEndsAtLocal);
    if (discountedEndsAt && !isPast(discountedEndsAt, now)) discountedEnabled = true;
    if (premiumEndsAt && !isPast(premiumEndsAt, now)) premiumEnabled = true;
    if (regularEndsAt && !isPast(regularEndsAt, now)) regularEnabled = true;
    if (payLaterEndsAt && !isPast(payLaterEndsAt, now)) payLaterEnabled = true;
  }

  const settings = await prisma.eventSettings.upsert({
    where: { id: SETTINGS_ID },
    update: {
      discountedEndsAt,
      registrationEndsAt,
      premiumEndsAt,
      regularEndsAt,
      payLaterEndsAt,
      discountedEnabled,
      registrationEnabled,
      premiumEnabled,
      regularEnabled,
      payLaterEnabled,
    },
    create: {
      id: SETTINGS_ID,
      discountedEndsAt,
      registrationEndsAt,
      premiumEndsAt,
      regularEndsAt,
      payLaterEndsAt,
      discountedEnabled,
      registrationEnabled,
      premiumEnabled,
      regularEnabled,
      payLaterEnabled,
    },
  });

  const status = await getRegistrationStatus();
  return NextResponse.json(payload(settings, status));
}
