"use client";

import { useEffect, useMemo, useState } from "react";
import { ExportButton } from "@/components/ExportButton";
import { AGE_CATEGORIES, PAYMENT_PACKAGES, SANDO_SIZES } from "@/lib/constants";

type Stats = {
  total: number;
  attended: number;
  pendingAttendance: number;
  attendanceRate: number;
  attendedToday: number;
  otherCount: number;
  reservedQuota: number;
  quotaFillPercent: number;
  overflowCount: number;
  discountedRemaining: number;
  discountedUsed: number;
  discountedVisible: boolean;
  premiumOpen?: boolean;
  regularOpen?: boolean;
  payLaterCount?: number;
  revenue: number;
  averageAge: number;
  todayCount: number;
  last7Count: number;
  churches: Array<{
    code: string;
    name: string;
    zone: number | null;
    estimatedQuota: number;
    reservedRange: string;
    registered: number;
    remaining: number;
    fillPercent: number;
    overflow: boolean;
  }>;
  zoneTotals: Array<{
    zone: number;
    churches: number;
    registered: number;
    quota: number;
    fillPercent: number;
  }>;
  daily: Array<{ date: string; count: number }>;
  byPackage: Record<string, number>;
  revenueByPackage: Record<string, number>;
  byPaymentMethod: { ONLINE: number; CASH: number; PAY_LATER?: number };
  revenueByPaymentMethod: { ONLINE: number; CASH: number; PAY_LATER?: number };
  byAge: Record<string, number>;
  bySex: Record<string, number>;
  bySize: Record<string, number>;
};

function pesos(value: number) {
  return `₱${value.toLocaleString("en-PH")}`;
}

function percent(value: number) {
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}

function BarList({
  items,
  total,
  color = "bg-teal",
}: {
  items: Array<{ label: string; value: number }>;
  total: number;
  color?: string;
}) {
  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const width = total > 0 ? Math.max(item.value > 0 ? 4 : 0, (item.value / total) * 100) : 0;
        const share = total > 0 ? Math.round((item.value / total) * 1000) / 10 : 0;
        return (
          <li key={item.label}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium text-navy">{item.label}</span>
              <span className="shrink-0 font-extrabold text-navy">
                {item.value.toLocaleString()}
                <span className="ml-2 text-xs font-semibold text-slate-400">{percent(share)}</span>
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function DailyChart({ daily }: { daily: Array<{ date: string; count: number }> }) {
  const max = Math.max(1, ...daily.map((row) => row.count));
  return (
    <div className="flex h-40 items-end gap-1.5">
      {daily.map((row) => {
        const height = Math.max(row.count > 0 ? 8 : 3, (row.count / max) * 100);
        const label = row.date.slice(5);
        return (
          <div key={row.date} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <div className="flex h-32 w-full items-end rounded-md bg-sand">
              <div
                className="w-full rounded-md bg-gradient-to-t from-navy to-teal"
                style={{ height: `${height}%` }}
                title={`${row.date}: ${row.count}`}
              />
            </div>
            <span className="text-[10px] font-semibold text-slate-400">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((res) => res.json())
      .then(setStats)
      .catch(() => undefined);
  }, []);

  const packageItems = useMemo(() => {
    if (!stats) return [];
    return (Object.keys(PAYMENT_PACKAGES) as Array<keyof typeof PAYMENT_PACKAGES>).map((id) => ({
      label: `${PAYMENT_PACKAGES[id].label} ₱${PAYMENT_PACKAGES[id].amount}`,
      value: stats.byPackage[id] ?? 0,
    }));
  }, [stats]);

  const ageItems = useMemo(() => {
    if (!stats) return [];
    return AGE_CATEGORIES.map((category) => ({
      label: category.label,
      value: stats.byAge[category.id] ?? 0,
    }));
  }, [stats]);

  const sizeItems = useMemo(() => {
    if (!stats) return [];
    return SANDO_SIZES.map((size) => ({
      label: size.label,
      value: stats.bySize[size.id] ?? 0,
    }));
  }, [stats]);

  if (!stats) {
    return <p className="px-4 py-6 text-sm text-slate-500">Loading analytics...</p>;
  }

  const kpis = [
    { label: "Total registered", value: stats.total.toLocaleString(), hint: `${stats.todayCount} today · ${stats.last7Count} last 7 days` },
    { label: "Collected payments", value: pesos(stats.revenue), hint: `${stats.total} paid registrations` },
    {
      label: "Online payments",
      value: stats.byPaymentMethod.ONLINE.toLocaleString(),
      hint: pesos(stats.revenueByPaymentMethod.ONLINE),
    },
    {
      label: "Cash payments",
      value: stats.byPaymentMethod.CASH.toLocaleString(),
      hint: pesos(stats.revenueByPaymentMethod.CASH),
    },
    { label: "Attendance rate", value: percent(stats.attendanceRate), hint: `${stats.attended} in · ${stats.pendingAttendance} pending` },
    { label: "Quota fill", value: percent(stats.quotaFillPercent), hint: `${stats.overflowCount} congregations over quota` },
  ];

  return (
    <div>
      <div className="flex flex-col gap-4 border-b border-slate-200/70 bg-white px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <h2 className="text-2xl font-extrabold text-navy">Analytics</h2>
          <p className="mt-1 text-sm text-slate-500">Live figures from actual registrations, payments, quotas, and attendance.</p>
        </div>
        <ExportButton href="/api/admin/export/analytics" label="Export Excel" />
      </div>

      <div className="grid grid-cols-2 border-b border-slate-200/70 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="border-b border-r border-slate-200/70 bg-white px-4 py-4 last:border-r-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{kpi.label}</p>
            <p className="mt-2 text-2xl font-extrabold tracking-tight text-navy xl:text-3xl">{kpi.value}</p>
            <p className="mt-1 text-xs text-slate-500">{kpi.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid border-b border-slate-200/70 lg:grid-cols-[1.4fr_1fr]">
        <section className="border-b border-slate-200/70 bg-white p-4 lg:border-b-0 lg:border-r">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h3 className="font-extrabold text-navy">Registrations by day</h3>
              <p className="text-xs text-slate-500">Last 14 days, Asia/Manila</p>
            </div>
            <p className="text-sm font-bold text-teal">{stats.todayCount} today</p>
          </div>
          <DailyChart daily={stats.daily} />
        </section>
        <section className="bg-white p-4">
          <h3 className="font-extrabold text-navy">Zone fill</h3>
          <p className="mb-4 text-xs text-slate-500">Registered vs reserved quota</p>
          <div className="space-y-4">
            {stats.zoneTotals.map((zone) => (
              <div key={zone.zone}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-semibold text-navy">Zone {zone.zone}</span>
                  <span className="font-bold text-navy">
                    {zone.registered}/{zone.quota}
                    <span className="ml-2 text-xs font-semibold text-slate-400">{percent(zone.fillPercent)}</span>
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${zone.fillPercent >= 100 ? "bg-orange" : "bg-teal"}`}
                    style={{ width: `${Math.min(100, zone.fillPercent)}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="rounded-2xl bg-sand px-4 py-3 text-sm">
              <span className="font-bold text-navy">Guest Participant 022</span>
              <span className="ml-2 text-slate-500">
                {stats.otherCount} registered · overflow numbers 541, 542, 543… are shared so the last digits never repeat
              </span>
            </div>
          </div>
        </section>
      </div>

      <div className="grid border-b border-slate-200/70 md:grid-cols-2 xl:grid-cols-5">
        <section className="border-b border-slate-200/70 bg-white p-4 md:border-r xl:border-b-0">
          <h3 className="mb-4 font-extrabold text-navy">Payment method</h3>
          <BarList
            items={[
              { label: "Online", value: stats.byPaymentMethod.ONLINE },
              { label: "Cash", value: stats.byPaymentMethod.CASH },
              { label: "Pay Later", value: stats.byPaymentMethod.PAY_LATER ?? stats.payLaterCount ?? 0 },
            ]}
            total={stats.total}
            color="bg-navy"
          />
          <ul className="mt-4 space-y-1 text-xs text-slate-500">
            <li>Online revenue: {pesos(stats.revenueByPaymentMethod.ONLINE)}</li>
            <li>Cash revenue: {pesos(stats.revenueByPaymentMethod.CASH)}</li>
            <li>Pay Later count: {stats.byPaymentMethod.PAY_LATER ?? stats.payLaterCount ?? 0}</li>
          </ul>
        </section>
        <section className="border-b border-slate-200/70 bg-white p-4 xl:border-b-0 xl:border-r">
          <h3 className="mb-4 font-extrabold text-navy">Payment packages</h3>
          <BarList items={packageItems} total={stats.total} color="bg-orange" />
          <ul className="mt-4 space-y-1 text-xs text-slate-500">
            <li>Discounted revenue: {pesos(stats.revenueByPackage.DISCOUNTED ?? 0)}</li>
            <li>Premium revenue: {pesos(stats.revenueByPackage.PREMIUM ?? 0)}</li>
            <li>Regular revenue: {pesos(stats.revenueByPackage.REGULAR ?? 0)}</li>
            <li>₱500 option is {stats.discountedVisible ? "still visible on the form" : "hidden on the form"}</li>
            <li>₱550 option is {stats.premiumOpen ? "open" : "closed"}</li>
            <li>₱350 option is {stats.regularOpen ? "open" : "closed"}</li>
            <li>Pay Later rows: {stats.payLaterCount ?? 0}</li>
          </ul>
        </section>
        <section className="border-b border-slate-200/70 bg-white p-4 md:border-r xl:border-b-0">
          <h3 className="mb-4 font-extrabold text-navy">Age categories</h3>
          <BarList items={ageItems} total={stats.total} />
        </section>
        <section className="border-b border-slate-200/70 bg-white p-4 xl:border-b-0 xl:border-r">
          <h3 className="mb-4 font-extrabold text-navy">Biological sex</h3>
          <BarList
            items={[
              { label: "Male", value: stats.bySex.MALE ?? 0 },
              { label: "Female", value: stats.bySex.FEMALE ?? 0 },
            ]}
            total={stats.total}
            color="bg-navy"
          />
        </section>
        <section className="bg-white p-4">
          <h3 className="mb-4 font-extrabold text-navy">Sando sizes</h3>
          <BarList items={sizeItems} total={stats.total} color="bg-teal" />
        </section>
      </div>

      {[1, 2, 3].map((zone) => (
        <section key={zone} className="border-b border-slate-200/70 bg-white">
          <div className="flex items-center justify-between px-4 py-3">
            <h3 className="font-extrabold text-navy">Zone {zone}</h3>
            <p className="text-xs font-semibold text-slate-500">
              {stats.zoneTotals.find((row) => row.zone === zone)?.registered ?? 0} registered
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-sand text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2">Code</th>
                  <th className="px-4 py-2">Congregation</th>
                  <th className="px-4 py-2">Registered</th>
                  <th className="px-4 py-2">Fill</th>
                  <th className="px-4 py-2">Remaining</th>
                  <th className="px-4 py-2">Reserved IDs</th>
                </tr>
              </thead>
              <tbody>
                {stats.churches
                  .filter((church) => church.zone === zone)
                  .map((church) => (
                    <tr key={church.code} className="border-t border-slate-100">
                      <td className="px-4 py-2.5 font-bold text-navy">{church.code}</td>
                      <td className="px-4 py-2.5">{church.name}</td>
                      <td className="px-4 py-2.5 font-semibold">
                        {church.registered}
                        <span className="ml-1 text-slate-400">/ {church.estimatedQuota}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${church.overflow ? "bg-orange" : "bg-teal"}`}
                              style={{ width: `${Math.min(100, church.fillPercent)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-bold ${church.overflow ? "text-orange" : "text-navy"}`}>
                            {church.fillPercent}%
                          </span>
                        </div>
                      </td>
                      <td className={`px-4 py-2.5 ${church.overflow ? "font-bold text-orange" : ""}`}>
                        {church.overflow ? `+${church.registered - church.estimatedQuota} overflow` : church.remaining}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{church.reservedRange}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
