import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const RECENT_PAGE_SIZE = 20;

function serialize(registration: {
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
  churchCode: string;
  otherChurchName: string | null;
  paymentStatus: string;
  attendedAt: Date | null;
  church: { name: string };
}) {
  return {
    id: registration.id,
    ticketId: registration.ticketId,
    fullName: registration.fullName,
    churchName: registration.otherChurchName || registration.church.name,
    churchCode: registration.churchCode,
    age: registration.age,
    sex: registration.sex,
    phone: registration.phone,
    facebook: registration.facebook,
    ageCategory: registration.ageCategory,
    sandoSize: registration.sandoSize,
    paymentPackage: registration.paymentPackage,
    amount: registration.amount,
    paymentStatus: registration.paymentStatus,
    attendedAt: registration.attendedAt,
  };
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  if (params.get("recent") === "1") {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const page = Math.max(Number(params.get("page") ?? 1), 1);
    const [recent, attendedToday, totalAttended] = await Promise.all([
      prisma.registration.findMany({
        where: { attendedAt: { not: null } },
        include: { church: true },
        orderBy: { attendedAt: "desc" },
        skip: (page - 1) * RECENT_PAGE_SIZE,
        take: RECENT_PAGE_SIZE,
      }),
      prisma.registration.count({ where: { attendedAt: { gte: startOfToday } } }),
      prisma.registration.count({ where: { attendedAt: { not: null } } }),
    ]);
    return NextResponse.json({
      attendedToday,
      totalAttended,
      page,
      pageSize: RECENT_PAGE_SIZE,
      totalPages: Math.max(1, Math.ceil(totalAttended / RECENT_PAGE_SIZE)),
      recent: recent.map(serialize),
    });
  }

  const ticketId = params.get("ticketId")?.trim().toUpperCase();
  if (!ticketId) {
    return NextResponse.json({ error: "Enter a ticket ID." }, { status: 400 });
  }

  const registration = await prisma.registration.findFirst({
    where: { ticketId: { equals: ticketId, mode: "insensitive" } },
    include: { church: true },
  });

  if (!registration) {
    return NextResponse.json({ error: "No registration found for that ID." }, { status: 404 });
  }

  return NextResponse.json(serialize(registration));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const ticketId = String(body?.ticketId ?? "").trim();
  if (!ticketId) {
    return NextResponse.json({ error: "Enter a ticket ID." }, { status: 400 });
  }

  const registration = await prisma.registration.findFirst({
    where: { ticketId: { equals: ticketId, mode: "insensitive" } },
  });

  if (!registration) {
    return NextResponse.json({ error: "No registration found for that ID." }, { status: 404 });
  }

  if (registration.attendedAt) {
    return NextResponse.json({ error: "This participant is already marked as attended.", already: true }, { status: 409 });
  }

  const updated = await prisma.registration.update({
    where: { id: registration.id },
    data: { attendedAt: new Date() },
    include: { church: true },
  });

  return NextResponse.json({
    ok: true,
    ticketId: updated.ticketId,
    fullName: updated.fullName,
    churchName: updated.otherChurchName || updated.church.name,
    attendedAt: updated.attendedAt,
  });
}
