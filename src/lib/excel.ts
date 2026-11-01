import ExcelJS from "exceljs";
import type { AnalyticsSnapshot } from "@/lib/analytics";
import { AGE_CATEGORIES, PAYMENT_PACKAGES, SANDO_SIZES } from "@/lib/constants";

const NAVY = "FF003366";
const TEAL = "FF00ACC1";

function manilaStamp() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date())
    .replace(/[/:]/g, "-")
    .replace(", ", "_");
}

export function manilaDateTime(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

export function labelFor<T extends { id: string; label: string }>(items: readonly T[], id: string) {
  return items.find((item) => item.id === id)?.label ?? id.replaceAll("_", " ");
}

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" }, name: "Calibri", size: 11 };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
  row.alignment = { vertical: "middle", wrapText: true };
  row.height = 22;
}

function autosize(sheet: ExcelJS.Worksheet) {
  sheet.columns.forEach((column) => {
    let max = 12;
    column.eachCell?.({ includeEmpty: false }, (cell) => {
      const length = String(cell.value ?? "").length;
      if (length > max) max = length;
    });
    column.width = Math.min(42, max + 3);
  });
}

function addTable(sheet: ExcelJS.Worksheet, headers: string[], rows: Array<Array<string | number>>) {
  sheet.addRow(headers);
  styleHeader(sheet.getRow(1));
  for (const row of rows) {
    const added = sheet.addRow(row);
    added.alignment = { vertical: "middle" };
  }
  autosize(sheet);
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: headers.length },
  };
}

export async function workbookBuffer(workbook: ExcelJS.Workbook) {
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function excelResponse(buffer: Buffer, filename: string) {
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function buildAnalyticsWorkbook(stats: AnalyticsSnapshot) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "AGOS Family Run 2026";
  workbook.created = new Date();

  const summary = workbook.addWorksheet("Summary");
  addTable(summary, ["Metric", "Value"], [
    ["Exported at (Asia/Manila)", manilaDateTime(new Date())],
    ["Total registered", stats.total],
    ["Attended", stats.attended],
    ["Pending attendance", stats.pendingAttendance],
    ["Attendance rate (%)", stats.attendanceRate],
    ["Checked in today", stats.attendedToday],
    ["Collected payments (PHP)", stats.revenue],
    ["Online payments", stats.byPaymentMethod.ONLINE],
    ["Online revenue (PHP)", stats.revenueByPaymentMethod.ONLINE],
    ["Cash payments", stats.byPaymentMethod.CASH],
    ["Cash revenue (PHP)", stats.revenueByPaymentMethod.CASH],
    ["Average age", stats.averageAge],
    ["Registered today", stats.todayCount],
    ["Registered last 7 days", stats.last7Count],
    ["Reserved quota", stats.reservedQuota],
    ["Quota fill (%)", stats.quotaFillPercent],
    ["Congregations over quota", stats.overflowCount],
    ["Guest Participant (022) registrations", stats.otherCount],
    ["Discounted used", stats.discountedUsed],
    ["Discounted remaining", stats.discountedRemaining],
    ["Discounted option visible", stats.discountedVisible ? "Yes" : "No"],
  ]);

  const daily = workbook.addWorksheet("Daily");
  addTable(
    daily,
    ["Date", "Registrations"],
    stats.daily.map((row) => [row.date, row.count]),
  );

  const packages = workbook.addWorksheet("Packages");
  addTable(
    packages,
    ["Package", "Count", "Revenue (PHP)"],
    (Object.keys(PAYMENT_PACKAGES) as Array<keyof typeof PAYMENT_PACKAGES>).map((id) => [
      `${PAYMENT_PACKAGES[id].label} (₱${PAYMENT_PACKAGES[id].amount})`,
      stats.byPackage[id] ?? 0,
      stats.revenueByPackage[id] ?? 0,
    ]),
  );

  const methods = workbook.addWorksheet("Payment methods");
  addTable(methods, ["Method", "Count", "Revenue (PHP)"], [
    ["Online", stats.byPaymentMethod.ONLINE, stats.revenueByPaymentMethod.ONLINE],
    ["Cash", stats.byPaymentMethod.CASH, stats.revenueByPaymentMethod.CASH],
  ]);

  const ages = workbook.addWorksheet("Age categories");
  addTable(
    ages,
    ["Category", "Count"],
    AGE_CATEGORIES.map((category) => [category.label, stats.byAge[category.id] ?? 0]),
  );

  const sex = workbook.addWorksheet("Sex");
  addTable(sex, ["Sex", "Count"], [
    ["Male", stats.bySex.MALE ?? 0],
    ["Female", stats.bySex.FEMALE ?? 0],
  ]);

  const sizes = workbook.addWorksheet("Sando sizes");
  addTable(
    sizes,
    ["Size", "Count"],
    SANDO_SIZES.map((size) => [size.label, stats.bySize[size.id] ?? 0]),
  );

  const zones = workbook.addWorksheet("Zones");
  addTable(
    zones,
    ["Zone", "Congregations", "Registered", "Quota", "Fill (%)"],
    stats.zoneTotals.map((zone) => [zone.zone, zone.churches, zone.registered, zone.quota, zone.fillPercent]),
  );

  const churches = workbook.addWorksheet("Congregations");
  addTable(
    churches,
    ["Code", "Congregation", "Zone", "Registered", "Quota", "Remaining", "Fill (%)", "Overflow", "Reserved IDs"],
    stats.churches.map((church) => [
      church.code,
      church.name,
      church.zone ?? "Guest Participant",
      church.registered,
      church.estimatedQuota,
      church.remaining,
      church.fillPercent,
      church.overflow ? "Yes" : "No",
      church.reservedRange,
    ]),
  );

  churches.getColumn(1).font = { bold: true, color: { argb: TEAL } };
  return workbook;
}

export async function buildRegistrationsWorkbook(
  items: Array<{
    ticketId: string;
    fullName: string;
    age: number;
    sex: string;
    phone: string;
    facebook: string;
    ageCategory: string;
    churchCode: string;
    churchName: string;
    otherChurchName: string | null;
    zone?: number | null;
    sandoSize: string;
    paymentPackage: string;
    amount: number;
    paymentMode?: string;
    amountPaid?: number;
    attendedAt: Date | string | null;
    createdAt: Date | string;
    paymentStatus?: string;
  }>,
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "AGOS Family Run 2026";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Registrations");
  addTable(
    sheet,
    [
      "Ticket ID",
      "Full Name",
      "Age",
      "Biological Sex",
      "Phone Number",
      "Facebook",
      "Category",
      "Zone",
      "Local Congregation",
      "Church Code",
      "Sando Size",
      "Package",
      "Amount (PHP)",
      "Amount Paid (PHP)",
      "Balance (PHP)",
      "Payment Method",
      "Payment Status",
      "Attended",
      "Attended At",
      "Registered At",
    ],
    items.map((item) => {
      const amountPaid = item.amountPaid ?? (item.paymentMode === "PAY_LATER" ? 0 : item.amount);
      return [
        item.ticketId,
        item.fullName,
        item.age,
        item.sex === "MALE" ? "Male" : item.sex === "FEMALE" ? "Female" : item.sex,
        item.phone,
        item.facebook,
        labelFor(AGE_CATEGORIES, item.ageCategory),
        item.zone ? `Zone ${item.zone}` : "Guest Participant",
        item.otherChurchName || item.churchName,
        item.churchCode,
        labelFor(SANDO_SIZES, item.sandoSize),
        PAYMENT_PACKAGES[item.paymentPackage as keyof typeof PAYMENT_PACKAGES]?.label ?? item.paymentPackage,
        item.amount,
        amountPaid,
        Math.max(0, item.amount - amountPaid),
        item.paymentMode === "CASH" ? "Cash" : item.paymentMode === "PAY_LATER" ? "Pay Later" : "Online",
        item.paymentStatus === "VALID" ? "Valid" : item.paymentStatus === "DENIED" ? "Denied" : "Pending",
        item.attendedAt ? "Yes" : "No",
        manilaDateTime(item.attendedAt),
        manilaDateTime(item.createdAt),
      ];
    }),
  );

  return workbook;
}

export function exportFilename(kind: "analytics" | "registrations") {
  return `AGOS-2026-${kind}-${manilaStamp()}.xlsx`;
}
