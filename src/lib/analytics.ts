import { findChurch, OTHER_CHURCH_CODE, reservedRangeLabel } from "@/lib/churches";
import { prisma } from "@/lib/prisma";
import { EARLY_BIRD_HIDE_AT } from "@/lib/constants";
import {
  getEventSettings,
  getRegistrationStatus,
  isDiscountedWindowOpen,
  isPremiumWindowOpen,
  isRegularWindowOpen,
} from "@/lib/event-settings";

function manilaDay(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function lastNDays(n: number) {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    days.push(manilaDay(date));
  }
  return days;
}

export type AnalyticsSnapshot = Awaited<ReturnType<typeof getAnalytics>>;

export async function getAnalytics() {
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);
  fourteenDaysAgo.setHours(0, 0, 0, 0);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    total,
    attended,
    churches,
    byPackage,
    byPaymentMode,
    byAge,
    bySex,
    bySize,
    aggregates,
    recentCreated,
    attendedToday,
    settings,
  ] = await Promise.all([
    prisma.registration.count(),
    prisma.registration.count({ where: { attendedAt: { not: null } } }),
    prisma.church.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        code: true,
        name: true,
        zone: true,
        estimatedQuota: true,
        slotStart: true,
        _count: { select: { registrations: true } },
      },
    }),
    prisma.registration.groupBy({
      by: ["paymentPackage"],
      _count: { _all: true },
      _sum: { amount: true },
    }),
    prisma.registration.groupBy({
      by: ["paymentMode"],
      _count: { _all: true },
      _sum: { amount: true },
    }),
    prisma.registration.groupBy({
      by: ["ageCategory"],
      _count: { _all: true },
    }),
    prisma.registration.groupBy({
      by: ["sex"],
      _count: { _all: true },
    }),
    prisma.registration.groupBy({
      by: ["sandoSize"],
      _count: { _all: true },
    }),
    prisma.registration.aggregate({
      _sum: { amount: true },
      _avg: { age: true },
    }),
    prisma.registration.findMany({
      where: { createdAt: { gte: fourteenDaysAgo } },
      select: { createdAt: true },
    }),
    prisma.registration.count({
      where: { attendedAt: { gte: startOfToday } },
    }),
    getEventSettings(),
  ]);

  const dayCounts = new Map<string, number>();
  for (const row of recentCreated) {
    const key = manilaDay(row.createdAt);
    dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
  }
  const daily = lastNDays(14).map((date) => ({
    date,
    count: dayCounts.get(date) ?? 0,
  }));

  const churchRows = churches.map((church) => {
    const definition = findChurch(church.code);
    const registered = church._count.registrations;
    const quota = church.estimatedQuota;
    return {
      code: church.code,
      name: church.name,
      zone: church.zone,
      estimatedQuota: quota,
      slotStart: church.slotStart,
      reservedRange: definition
        ? reservedRangeLabel(definition)
        : `${church.code}-${String(church.slotStart).padStart(3, "0")}`,
      registered,
      remaining: Math.max(0, quota - registered),
      fillPercent: quota > 0 ? Math.round((registered / quota) * 100) : registered > 0 ? 100 : 0,
      overflow: quota > 0 && registered > quota,
    };
  });

  const zoneTotals = [1, 2, 3].map((zone) => {
    const rows = churchRows.filter((church) => church.zone === zone);
    const registered = rows.reduce((sum, row) => sum + row.registered, 0);
    const quota = rows.reduce((sum, row) => sum + row.estimatedQuota, 0);
    return {
      zone,
      churches: rows.length,
      registered,
      quota,
      fillPercent: quota > 0 ? Math.round((registered / quota) * 100) : 0,
    };
  });

  const otherCount = churchRows.find((row) => row.code === OTHER_CHURCH_CODE)?.registered ?? 0;
  const reservedQuota = churchRows
    .filter((row) => row.code !== OTHER_CHURCH_CODE)
    .reduce((sum, row) => sum + row.estimatedQuota, 0);
  const overflowCount = churchRows.filter((row) => row.overflow).length;
  const last7 = daily.slice(-7).reduce((sum, row) => sum + row.count, 0);
  const todayCount = daily.at(-1)?.count ?? 0;
  const revenue = aggregates._sum.amount ?? 0;

  let cashCount = 0;
  let cashRevenue = 0;
  let onlineCount = 0;
  let onlineRevenue = 0;
  let payLaterCount = 0;
  for (const row of byPaymentMode) {
    if (row.paymentMode === "CASH") {
      cashCount += row._count._all;
      cashRevenue += row._sum.amount ?? 0;
    } else if (row.paymentMode === "PAY_LATER") {
      payLaterCount += row._count._all;
    } else {
      onlineCount += row._count._all;
      onlineRevenue += row._sum.amount ?? 0;
    }
  }

  const registrationStatus = await getRegistrationStatus();

  return {
    total,
    attended,
    pendingAttendance: Math.max(0, total - attended),
    attendanceRate: total > 0 ? Math.round((attended / total) * 1000) / 10 : 0,
    attendedToday,
    otherCount,
    reservedQuota,
    quotaFillPercent: reservedQuota > 0 ? Math.round((Math.max(0, total - otherCount) / reservedQuota) * 1000) / 10 : 0,
    overflowCount,
    discountedRemaining: Math.max(0, EARLY_BIRD_HIDE_AT - total),
    discountedUsed: Math.min(total, EARLY_BIRD_HIDE_AT),
    discountedVisible: isDiscountedWindowOpen(settings) && total < EARLY_BIRD_HIDE_AT,
    premiumOpen: isPremiumWindowOpen(settings),
    regularOpen: isRegularWindowOpen(settings),
    registrationOpen: registrationStatus.registrationOpen,
    discountedEndsAt: settings.discountedEndsAt?.toISOString() ?? null,
    registrationEndsAt: settings.registrationEndsAt?.toISOString() ?? null,
    premiumEndsAt: settings.premiumEndsAt?.toISOString() ?? null,
    regularEndsAt: settings.regularEndsAt?.toISOString() ?? null,
    payLaterEndsAt: settings.payLaterEndsAt?.toISOString() ?? null,
    payLaterCount,
    revenue,
    averageAge: aggregates._avg.age ? Math.round(aggregates._avg.age * 10) / 10 : 0,
    todayCount,
    last7Count: last7,
    churches: churchRows,
    zoneTotals,
    daily,
    byPackage: Object.fromEntries(byPackage.map((row) => [row.paymentPackage, row._count._all])),
    revenueByPackage: Object.fromEntries(byPackage.map((row) => [row.paymentPackage, row._sum.amount ?? 0])),
    byPaymentMethod: {
      ONLINE: onlineCount,
      CASH: cashCount,
      PAY_LATER: payLaterCount,
    },
    revenueByPaymentMethod: {
      ONLINE: onlineRevenue,
      CASH: cashRevenue,
      PAY_LATER: 0,
    },
    byAge: Object.fromEntries(byAge.map((row) => [row.ageCategory, row._count._all])),
    bySex: Object.fromEntries(bySex.map((row) => [row.sex, row._count._all])),
    bySize: Object.fromEntries(bySize.map((row) => [row.sandoSize, row._count._all])),
  };
}
