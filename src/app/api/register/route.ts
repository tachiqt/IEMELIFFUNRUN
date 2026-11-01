import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { AgeCategory, PaymentMode, Prisma, SandoSize } from "@prisma/client";
import { findChurch } from "@/lib/churches";
import {
  ALLOWED_PROOF_TYPES,
  EARLY_BIRD_HIDE_AT,
  MAX_PROOF_BYTES,
  PAYMENT_PACKAGES,
  formatTicketId,
} from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { uploadPaymentProof } from "@/lib/r2";
import { appendRegistrationToSheet } from "@/lib/sheets";
import { nextTicketSequence } from "@/lib/ticket-sequence";
import {
  getEventSettings,
  isDiscountedWindowOpen,
  isPayLaterWindowOpen,
  isPremiumWindowOpen,
  isRegularWindowOpen,
} from "@/lib/event-settings";
import { registrationSchema, registrationErrorMessage, normalizeRegistrationInput, normalizeFullNameKey } from "@/lib/validation";
import { findRegistrationByFullName } from "@/lib/full-name";

export const runtime = "nodejs";
export const maxDuration = 60;

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const normalized = normalizeRegistrationInput({
      fullName: String(form.get("fullName") ?? ""),
      age: String(form.get("age") ?? ""),
      sex: String(form.get("sex") ?? "") as "MALE" | "FEMALE" | "",
      phone: String(form.get("phone") ?? ""),
      facebook: String(form.get("facebook") ?? ""),
      ageCategory: String(form.get("ageCategory") ?? ""),
      zone: form.get("zone") ? Number(form.get("zone")) : null,
      churchCode: String(form.get("churchCode") ?? ""),
      sandoSize: String(form.get("sandoSize") ?? ""),
      paymentPackage: String(form.get("paymentPackage") ?? "") as "DISCOUNTED" | "PREMIUM" | "REGULAR" | "",
      paymentMode: (String(form.get("paymentMode") ?? "FULL") as "FULL" | "CASH" | "PAY_LATER") || "FULL",
    });

    if (!normalized) {
      return NextResponse.json({ error: "Please choose a registration package." }, { status: 400 });
    }

    const parsed = registrationSchema.safeParse(normalized);

    if (!parsed.success) {
      return NextResponse.json(
        { error: registrationErrorMessage(parsed.error), details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const settings = await getEventSettings();
    if (!settings.registrationEnabled) {
      return NextResponse.json({ error: "Registration is closed." }, { status: 403 });
    }

    if (data.paymentPackage === "DISCOUNTED" && !isDiscountedWindowOpen(settings)) {
      return NextResponse.json(
        { error: "The discounted ₱500 slots are no longer available. Please choose Premium or Regular." },
        { status: 409 },
      );
    }
    if (data.paymentPackage === "PREMIUM" && !isPremiumWindowOpen(settings)) {
      return NextResponse.json({ error: "The ₱550 Premium registration option is no longer available." }, { status: 409 });
    }
    if (data.paymentPackage === "REGULAR" && !isRegularWindowOpen(settings)) {
      return NextResponse.json({ error: "The ₱350 Regular registration option is no longer available." }, { status: 409 });
    }

    const paymentMode: PaymentMode =
      data.paymentMode === "CASH" ? "CASH" : data.paymentMode === "PAY_LATER" ? "PAY_LATER" : "FULL";

    if (paymentMode === "PAY_LATER" && !isPayLaterWindowOpen(settings)) {
      return NextResponse.json({ error: "Pay Later arrangements are no longer available." }, { status: 409 });
    }

    const anyPackageOpen =
      isDiscountedWindowOpen(settings) || isPremiumWindowOpen(settings) || isRegularWindowOpen(settings);
    if (!anyPackageOpen) {
      return NextResponse.json({ error: "Registration is closed." }, { status: 403 });
    }

    let proofKey: string | null = null;
    if (paymentMode !== "PAY_LATER") {
      const file = form.get("paymentProof");
      if (!(file instanceof File) || file.size === 0) {
        return NextResponse.json({ error: "Proof of payment is required." }, { status: 400 });
      }
      if (file.size > MAX_PROOF_BYTES) {
        return NextResponse.json({ error: "Proof of payment must be 10 MB or smaller." }, { status: 400 });
      }
      if (!ALLOWED_PROOF_TYPES.includes(file.type)) {
        return NextResponse.json({ error: "Upload a JPG, PNG, WEBP, GIF, or PDF file." }, { status: 400 });
      }
      proofKey = `proofs/${randomUUID()}-${safeFileName(file.name || "proof")}`;
      await uploadPaymentProof({
        key: proofKey,
        body: Buffer.from(await file.arrayBuffer()),
        contentType: file.type || "application/octet-stream",
      });
    }

    const churchCode = data.churchCode;
    const church = findChurch(churchCode);
    if (!church) {
      return NextResponse.json({ error: "Unknown local congregation." }, { status: 400 });
    }

    const existingName = await findRegistrationByFullName(data.fullName);
    if (existingName) {
      return NextResponse.json({ error: "This full name is already registered." }, { status: 409 });
    }

    const pkg = PAYMENT_PACKAGES[data.paymentPackage];
    const sandoSize = data.paymentPackage === "REGULAR" ? "NOT_APPLICABLE" : data.sandoSize;
    const otherChurchName = null;
    const amountPaid = paymentMode === "PAY_LATER" ? 0 : pkg.amount;

    const registration = await prisma.$transaction(async (tx) => {
      const count = await tx.registration.count();
      if (!settings.registrationEnabled) {
        throw new Error("REGISTRATION_CLOSED");
      }
      if (data.paymentPackage === "DISCOUNTED" && (count >= EARLY_BIRD_HIDE_AT || !isDiscountedWindowOpen(settings))) {
        throw new Error("DISCOUNTED_UNAVAILABLE");
      }
      if (data.paymentPackage === "PREMIUM" && !isPremiumWindowOpen(settings)) {
        throw new Error("PREMIUM_UNAVAILABLE");
      }
      if (data.paymentPackage === "REGULAR" && !isRegularWindowOpen(settings)) {
        throw new Error("REGULAR_UNAVAILABLE");
      }
      if (paymentMode === "PAY_LATER" && !isPayLaterWindowOpen(settings)) {
        throw new Error("PAY_LATER_UNAVAILABLE");
      }

      const duplicate = await findRegistrationByFullName(data.fullName, tx);
      if (duplicate) {
        throw new Error("NAME_TAKEN");
      }

      const sequence = await nextTicketSequence(tx, church);
      const ticketId = formatTicketId(churchCode, sequence);

      return tx.registration.create({
        data: {
          ticketId,
          churchCode,
          otherChurchName,
          sequence,
          fullName: data.fullName,
          fullNameKey: normalizeFullNameKey(data.fullName),
          age: data.age,
          sex: data.sex,
          phone: data.phone,
          facebook: data.facebook,
          ageCategory: data.ageCategory as AgeCategory,
          sandoSize: sandoSize as SandoSize,
          paymentPackage: data.paymentPackage,
          amount: pkg.amount,
          amountPaid,
          paymentMode,
          paymentProofKey: proofKey,
        },
      });
    });

    try {
      await appendRegistrationToSheet({
        ticketId: registration.ticketId,
        fullName: registration.fullName,
        age: registration.age,
        sex: registration.sex,
        phone: registration.phone,
        facebook: registration.facebook,
        ageCategory: registration.ageCategory,
        churchCode: registration.churchCode,
        otherChurchName: registration.otherChurchName,
        sandoSize: registration.sandoSize,
        paymentPackage: registration.paymentPackage,
        amount: registration.amount,
        createdAt: registration.createdAt,
      });
    } catch (sheetError) {
      console.error("Google Sheets sync failed", sheetError);
    }

    return NextResponse.json({
      ticketId: registration.ticketId,
      churchCode: registration.churchCode,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "REGISTRATION_CLOSED") {
      return NextResponse.json({ error: "Registration is closed." }, { status: 403 });
    }
    if (error instanceof Error && error.message === "DISCOUNTED_UNAVAILABLE") {
      return NextResponse.json(
        { error: "The discounted ₱500 slots are already full. Please choose Premium or Regular." },
        { status: 409 },
      );
    }
    if (error instanceof Error && error.message === "PREMIUM_UNAVAILABLE") {
      return NextResponse.json({ error: "The ₱550 Premium registration option is no longer available." }, { status: 409 });
    }
    if (error instanceof Error && error.message === "REGULAR_UNAVAILABLE") {
      return NextResponse.json({ error: "The ₱350 Regular registration option is no longer available." }, { status: 409 });
    }
    if (error instanceof Error && error.message === "PAY_LATER_UNAVAILABLE") {
      return NextResponse.json({ error: "Pay Later arrangements are no longer available." }, { status: 409 });
    }
    if (error instanceof Error && error.message === "NAME_TAKEN") {
      return NextResponse.json({ error: "This full name is already registered." }, { status: 409 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        const target = Array.isArray(error.meta?.target) ? error.meta.target.join(" ") : String(error.meta?.target ?? "");
        if (target.includes("full_name_key") || target.includes("fullNameKey")) {
          return NextResponse.json({ error: "This full name is already registered." }, { status: 409 });
        }
      }
      return NextResponse.json({ error: "Could not save this registration. Please try again." }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}
