import { NextRequest, NextResponse } from "next/server";
import { findRegistrationByFullName } from "@/lib/full-name";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const fullName = request.nextUrl.searchParams.get("fullName")?.trim() ?? "";
  if (fullName.length < 2) {
    return NextResponse.json({ taken: false });
  }
  const existing = await findRegistrationByFullName(fullName);
  return NextResponse.json({ taken: Boolean(existing) });
}
