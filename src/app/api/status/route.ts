import { NextRequest, NextResponse } from "next/server";
import { churchDisplayName } from "@/lib/churches";
import { PAYMENT_PACKAGES, isPublicTicketId, normalizePublicTicketId } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("ticketId")?.trim() ?? "";
  const ticketId = normalizePublicTicketId(raw);
  if (!isPublicTicketId(ticketId)) {
    return NextResponse.json({ error: "Enter your race bib ID like 101-001 or 101001." }, { status: 400 });
  }

  const registration = await prisma.registration.findFirst({
    where: { ticketId: { equals: ticketId, mode: "insensitive" } },
  });
  if (!registration) {
    return NextResponse.json({ error: "No registration found for that ID." }, { status: 404 });
  }

  const pkg = PAYMENT_PACKAGES[registration.paymentPackage as keyof typeof PAYMENT_PACKAGES];

  return NextResponse.json({
    ticketId: registration.ticketId,
    fullName: registration.fullName,
    age: registration.age,
    sex: registration.sex,
    phone: registration.phone,
    facebook: registration.facebook,
    ageCategory: registration.ageCategory,
    sandoSize: registration.sandoSize,
    paymentPackage: registration.paymentPackage,
    packageLabel: pkg?.label ?? registration.paymentPackage,
    amount: registration.amount,
    amountPaid: registration.amountPaid,
    balance: Math.max(0, registration.amount - registration.amountPaid),
    churchName: churchDisplayName(registration.churchCode, registration.otherChurchName),
    paymentMode: registration.paymentMode,
    paymentStatus: registration.paymentStatus,
    attendedAt: registration.attendedAt,
    createdAt: registration.createdAt,
  });
}
