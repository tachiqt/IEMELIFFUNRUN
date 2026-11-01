import { NextResponse } from "next/server";
import { getRegistrationStatus } from "@/lib/event-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = await getRegistrationStatus();
  return NextResponse.json(status);
}
