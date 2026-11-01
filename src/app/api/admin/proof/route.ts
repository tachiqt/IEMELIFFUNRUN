import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { ALLOWED_PROOF_TYPES, MAX_PROOF_BYTES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { getProofSignedUrl, uploadPaymentProof } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing registration id" }, { status: 400 });
  }

  const registration = await prisma.registration.findUnique({ where: { id } });
  if (!registration) {
    return NextResponse.json({ error: "Registration not found" }, { status: 404 });
  }

  const kind = request.nextUrl.searchParams.get("kind")?.trim();
  const key = kind === "balance" ? registration.balanceProofKey : registration.paymentProofKey;
  if (!key) {
    return NextResponse.json({ error: "Proof is not available." }, { status: 404 });
  }

  const url = await getProofSignedUrl(key);
  return NextResponse.json({ url });
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const id = String(form.get("id") ?? "").trim();
    const file = form.get("paymentProof");

    if (!id) {
      return NextResponse.json({ error: "Missing registration id." }, { status: 400 });
    }
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Proof of payment is required." }, { status: 400 });
    }
    if (file.size > MAX_PROOF_BYTES) {
      return NextResponse.json({ error: "Proof of payment must be 10 MB or smaller." }, { status: 400 });
    }
    if (!ALLOWED_PROOF_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Upload a JPG, PNG, WEBP, GIF, or PDF file." }, { status: 400 });
    }

    const registration = await prisma.registration.findUnique({ where: { id } });
    if (!registration) {
      return NextResponse.json({ error: "Registration not found." }, { status: 404 });
    }

    const proofKey = `proofs/admin-${randomUUID()}-${safeFileName(file.name || "proof")}`;
    await uploadPaymentProof({
      key: proofKey,
      body: Buffer.from(await file.arrayBuffer()),
      contentType: file.type || "application/octet-stream",
    });

    const updated = await prisma.registration.update({
      where: { id },
      data: { paymentProofKey: proofKey },
      include: { church: true },
    });

    const url = await getProofSignedUrl(proofKey);

    return NextResponse.json({
      ok: true,
      url,
      item: {
        id: updated.id,
        ticketId: updated.ticketId,
        fullName: updated.fullName,
        age: updated.age,
        sex: updated.sex,
        phone: updated.phone,
        facebook: updated.facebook,
        ageCategory: updated.ageCategory,
        sandoSize: updated.sandoSize,
        paymentPackage: updated.paymentPackage,
        amount: updated.amount,
        amountPaid: updated.amountPaid,
        balance: Math.max(0, updated.amount - updated.amountPaid),
        isPayLater: updated.paymentMode === "PAY_LATER" && updated.amountPaid < updated.amount,
        paymentMode: updated.paymentMode,
        churchCode: updated.churchCode,
        churchName: updated.church.name,
        otherChurchName: updated.otherChurchName,
        paymentStatus: updated.paymentStatus,
        paymentReviewedAt: updated.paymentReviewedAt,
        attendedAt: updated.attendedAt,
        createdAt: updated.createdAt,
        hasProof: Boolean(updated.paymentProofKey),
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not upload the payment proof." }, { status: 500 });
  }
}
