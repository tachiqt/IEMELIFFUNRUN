import { NextRequest, NextResponse } from "next/server";
import { PaymentMode, PaymentStatus, Prisma, SandoSize } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const STATUSES = new Set<string>(Object.values(PaymentStatus));
const SIZES = new Set<string>(Object.values(SandoSize));
const PAYMENT_MODES = new Set<string>(["FULL", "CASH", "PAY_LATER"]);
const PAGE_SIZE = 20;

function isOpenPayLater(item: { paymentMode: string; amount: number; amountPaid: number }) {
  return item.paymentMode === "PAY_LATER" && item.amountPaid < item.amount;
}

function serialize(item: {
  id: string;
  ticketId: string;
  fullName: string;
  age: number;
  sex: string;
  phone: string;
  facebook: string;
  ageCategory: string;
  sandoSize: string;
  paymentPackage: string;
  amount: number;
  amountPaid: number;
  paymentMode: string;
  churchCode: string;
  otherChurchName: string | null;
  paymentStatus: PaymentStatus;
  paymentReviewedAt: Date | null;
  attendedAt: Date | null;
  createdAt: Date;
  church: { name: string };
  paymentProofKey: string | null;
}) {
  const balance = Math.max(0, item.amount - item.amountPaid);
  return {
    id: item.id,
    ticketId: item.ticketId,
    fullName: item.fullName,
    age: item.age,
    sex: item.sex,
    phone: item.phone,
    facebook: item.facebook,
    ageCategory: item.ageCategory,
    sandoSize: item.sandoSize,
    paymentPackage: item.paymentPackage,
    amount: item.amount,
    amountPaid: item.amountPaid,
    balance,
    isPayLater: isOpenPayLater(item),
    paymentMode: item.paymentMode,
    churchCode: item.churchCode,
    churchName: item.church.name,
    otherChurchName: item.otherChurchName,
    paymentStatus: item.paymentStatus,
    paymentReviewedAt: item.paymentReviewedAt,
    attendedAt: item.attendedAt,
    createdAt: item.createdAt,
    hasProof: Boolean(item.paymentProofKey),
  };
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const status = request.nextUrl.searchParams.get("status")?.trim().toUpperCase() ?? "";
  const mode = request.nextUrl.searchParams.get("mode")?.trim().toUpperCase() ?? "";
  const pageSize = Math.min(Math.max(Number(request.nextUrl.searchParams.get("pageSize") ?? PAGE_SIZE), 1), 100);
  const page = Math.max(Number(request.nextUrl.searchParams.get("page") ?? 1), 1);

  const search: Prisma.RegistrationWhereInput = q
    ? {
        OR: [
          { ticketId: { contains: q, mode: "insensitive" } },
          { fullName: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
          { facebook: { contains: q, mode: "insensitive" } },
          { otherChurchName: { contains: q, mode: "insensitive" } },
          { church: { name: { contains: q, mode: "insensitive" } } },
        ],
      }
    : {};

  // Pending excludes PAY_LATER so Pay Later stays in its own tab.
  let where: Prisma.RegistrationWhereInput = search;
  if (mode === "PAY_LATER") {
    where = { AND: [search, { paymentMode: "PAY_LATER" }] };
  } else if (status === "PENDING") {
    where = { AND: [search, { paymentStatus: "PENDING" }, { paymentMode: { not: "PAY_LATER" } }] };
  } else if (status && STATUSES.has(status)) {
    where = { AND: [search, { paymentStatus: status as PaymentStatus }] };
  }

  const [itemsRaw, total, pendingCount, validCount, deniedCount, allCount, payLaterCandidates] = await Promise.all([
    prisma.registration.findMany({
      where,
      include: { church: true },
      orderBy: { createdAt: "desc" },
      skip: mode === "PAY_LATER" ? 0 : (page - 1) * pageSize,
      take: mode === "PAY_LATER" ? 500 : pageSize,
    }),
    prisma.registration.count({ where }),
    prisma.registration.count({
      where: { AND: [search, { paymentStatus: "PENDING" }, { paymentMode: { not: "PAY_LATER" } }] },
    }),
    prisma.registration.count({ where: { AND: [search, { paymentStatus: "VALID" }] } }),
    prisma.registration.count({ where: { AND: [search, { paymentStatus: "DENIED" }] } }),
    prisma.registration.count({ where: search }),
    prisma.registration.findMany({
      where: { AND: [search, { paymentMode: "PAY_LATER" }] },
      select: { amount: true, amountPaid: true },
    }),
  ]);

  const payLaterCount = payLaterCandidates.filter((row) => row.amountPaid < row.amount).length;

  let items = itemsRaw;
  let filteredTotal = total;
  if (mode === "PAY_LATER") {
    const openOnly = itemsRaw.filter((item) => item.amountPaid < item.amount);
    filteredTotal = openOnly.length;
    items = openOnly.slice((page - 1) * pageSize, page * pageSize);
  }

  return NextResponse.json({
    total: filteredTotal,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(filteredTotal / pageSize)),
    counts: {
      all: allCount,
      PENDING: pendingCount,
      VALID: validCount,
      DENIED: deniedCount,
      PAY_LATER: payLaterCount,
    },
    items: items.map(serialize),
  });
}

export async function PATCH(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    id?: string;
    paymentStatus?: string;
    sandoSize?: string;
    paymentMode?: string;
    amountPaid?: number | string;
    markFullyPaid?: boolean;
  } | null;
  const id = body?.id?.trim();
  const paymentStatus = body?.paymentStatus?.trim().toUpperCase();
  const sandoSize = body?.sandoSize?.trim().toUpperCase();
  const paymentMode = body?.paymentMode?.trim().toUpperCase();
  const markFullyPaid = Boolean(body?.markFullyPaid);
  const amountPaidRaw = body?.amountPaid;

  if (!id) {
    return NextResponse.json({ error: "Missing registration id." }, { status: 400 });
  }

  const existing = await prisma.registration.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Registration not found." }, { status: 404 });
  }

  const data: Prisma.RegistrationUpdateInput = {};

  if (sandoSize !== undefined) {
    if (!SIZES.has(sandoSize)) {
      return NextResponse.json({ error: "Choose a valid sando size." }, { status: 400 });
    }
    data.sandoSize = sandoSize as SandoSize;
  }

  if (paymentMode !== undefined) {
    if (!PAYMENT_MODES.has(paymentMode)) {
      return NextResponse.json({ error: "Choose Online, Cash, or Pay Later." }, { status: 400 });
    }
    data.paymentMode = paymentMode as PaymentMode;
  }

  if (markFullyPaid) {
    data.amountPaid = existing.amount;
    data.paymentStatus = "VALID";
    data.paymentReviewedAt = new Date();
  } else if (amountPaidRaw !== undefined) {
    const amountPaid = typeof amountPaidRaw === "number" ? amountPaidRaw : Number(amountPaidRaw);
    if (!Number.isFinite(amountPaid) || amountPaid < 0 || amountPaid > existing.amount) {
      return NextResponse.json({ error: `Amount paid must be between 0 and ₱${existing.amount}.` }, { status: 400 });
    }
    data.amountPaid = Math.round(amountPaid);
    if (Math.round(amountPaid) >= existing.amount) {
      data.paymentStatus = "VALID";
      data.paymentReviewedAt = new Date();
    }
  }

  if (paymentStatus !== undefined) {
    if (!STATUSES.has(paymentStatus)) {
      return NextResponse.json({ error: "Choose Pending, Valid, or Denied." }, { status: 400 });
    }
    data.paymentStatus = paymentStatus as PaymentStatus;
    data.paymentReviewedAt = paymentStatus === "PENDING" ? null : new Date();
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  try {
    const updated = await prisma.registration.update({
      where: { id },
      data,
      include: { church: true },
    });
    return NextResponse.json({ item: serialize(updated) });
  } catch {
    return NextResponse.json({ error: "Registration not found." }, { status: 404 });
  }
}

export async function DELETE(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { id?: string } | null;
  const id = body?.id?.trim();
  if (!id) {
    return NextResponse.json({ error: "Missing registration id." }, { status: 400 });
  }

  try {
    const deleted = await prisma.registration.delete({
      where: { id },
      include: { church: true },
    });
    return NextResponse.json({ ok: true, item: serialize(deleted) });
  } catch {
    return NextResponse.json({ error: "Registration not found." }, { status: 404 });
  }
}
