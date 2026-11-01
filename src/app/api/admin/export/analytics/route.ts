import { getAnalytics } from "@/lib/analytics";
import { buildAnalyticsWorkbook, excelResponse, exportFilename, workbookBuffer } from "@/lib/excel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const stats = await getAnalytics();
  const workbook = await buildAnalyticsWorkbook(stats);
  const buffer = await workbookBuffer(workbook);
  return excelResponse(buffer, exportFilename("analytics"));
}
