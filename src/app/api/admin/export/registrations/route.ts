import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildRegistrationsWorkbook, excelResponse, exportFilename, workbookBuffer } from "@/lib/excel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const where: Prisma.RegistrationWhereInput = q
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

  const items = await prisma.registration.findMany({
    where,
    include: { church: true },
    orderBy: { createdAt: "desc" },
  });

  const workbook = await buildRegistrationsWorkbook(
    items.map((item) => ({
      ticketId: item.ticketId,
      fullName: item.fullName,
      age: item.age,
      sex: item.sex,
      phone: item.phone,
      facebook: item.facebook,
      ageCategory: item.ageCategory,
      churchCode: item.churchCode,
      churchName: item.church.name,
      otherChurchName: item.otherChurchName,
      zone: item.church.zone,
      sandoSize: item.sandoSize,
      paymentPackage: item.paymentPackage,
      amount: item.amount,
      amountPaid: item.amountPaid,
      paymentMode: item.paymentMode,
      paymentStatus: item.paymentStatus,
      attendedAt: item.attendedAt,
      createdAt: item.createdAt,
    })),
  );
  const buffer = await workbookBuffer(workbook);
  return excelResponse(buffer, exportFilename("registrations"));
}
