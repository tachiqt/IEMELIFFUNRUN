"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Search, Ticket } from "lucide-react";
import { AGE_CATEGORIES, PAYMENT_PACKAGES, PAYMENT_STATUSES, SANDO_SIZES } from "@/lib/constants";

type Found = {
  id: string;
  ticketId: string;
  fullName: string;
  churchName: string;
  churchCode?: string;
  age: number;
  sex?: string;
  phone?: string;
  facebook?: string;
  ageCategory?: string;
  sandoSize?: string;
  paymentPackage: string;
  amount?: number;
  paymentStatus?: string;
  attendedAt: string | null;
};

function labelFor<T extends { id: string; label: string }>(items: readonly T[], id?: string) {
  if (!id) return "—";
  return items.find((item) => item.id === id)?.label ?? id.replaceAll("_", " ");
}

export default function AttendancePage() {
  const [ticketId, setTicketId] = useState("");
  const [found, setFound] = useState<Found | null>(null);
  const [recent, setRecent] = useState<Found[]>([]);
  const [recentPage, setRecentPage] = useState(1);
  const [recentTotalPages, setRecentTotalPages] = useState(1);
  const [attendedToday, setAttendedToday] = useState(0);
  const [totalAttended, setTotalAttended] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadRecent(page = recentPage) {
    const res = await fetch(`/api/admin/attendance?recent=1&page=${page}`);
    const data = await res.json();
    if (res.ok) {
      setRecent(data.recent ?? []);
      setAttendedToday(data.attendedToday ?? 0);
      setTotalAttended(data.totalAttended ?? 0);
      setRecentTotalPages(data.totalPages ?? 1);
    }
  }

  useEffect(() => {
    loadRecent(recentPage).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentPage]);

  async function lookup(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    setFound(null);
    try {
      const res = await fetch(`/api/admin/attendance?ticketId=${encodeURIComponent(ticketId)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Not found.");
        return;
      }
      setFound(data);
    } finally {
      setLoading(false);
    }
  }

  async function markAttended() {
    if (!found) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: found.ticketId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not mark attendance.");
        return;
      }
      setFound({ ...found, attendedAt: data.attendedAt });
      setMessage(`${found.fullName} is now marked as attended.`);
      await loadRecent();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-sand lg:min-h-screen">
      <div className="grid border-b border-slate-200/70 bg-white sm:grid-cols-3">
        <div className="border-b border-slate-200/70 px-5 py-4 sm:border-b-0 sm:border-r">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Checked in today</p>
          <p className="mt-1 text-3xl font-extrabold text-navy">{attendedToday}</p>
        </div>
        <div className="border-b border-slate-200/70 px-5 py-4 sm:border-b-0 sm:border-r">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Total attended</p>
          <p className="mt-1 text-3xl font-extrabold text-navy">{totalAttended}</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Check-in</p>
          <p className="mt-2 text-sm text-slate-500">Look up a race bib, verify the runner, then mark attendance.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
        <div className="border-b border-slate-200/70 bg-white p-5 lg:min-h-[calc(100vh-140px)] lg:border-b-0 lg:border-r lg:p-8">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-navy text-white">
              <Ticket className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-2xl font-extrabold text-navy">Attendance</h2>
              <p className="text-sm text-slate-500">Enter the generated registration number.</p>
            </div>
          </div>

          <form onSubmit={lookup} className="flex flex-col gap-3 sm:flex-row">
            <input
              className="w-full rounded-2xl border border-slate-200 bg-sand px-5 py-4 font-mono text-xl font-extrabold tracking-[0.12em] text-navy outline-none placeholder:font-semibold placeholder:tracking-normal placeholder:text-slate-400 focus:border-teal focus:bg-white focus:ring-4 focus:ring-teal/15"
              placeholder="101-001"
              value={ticketId}
              onChange={(e) => setTicketId(e.target.value.toUpperCase())}
              autoFocus
            />
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-navy px-6 py-4 text-sm font-extrabold text-white disabled:opacity-60 sm:min-w-44"
            >
              <Search className="h-4 w-4" />
              {loading ? "Looking up..." : "Find"}
            </button>
          </form>

          {error ? (
            <p className="mt-4 rounded-2xl bg-orange/10 px-4 py-3 text-sm font-semibold text-orange">{error}</p>
          ) : null}
          {message ? (
            <p className="mt-4 rounded-2xl bg-teal/10 px-4 py-3 text-sm font-semibold text-teal">{message}</p>
          ) : null}

          {found ? (
            <section className="mt-6 overflow-hidden rounded-[28px] border border-slate-100 bg-gradient-to-br from-white to-sand shadow-[0_18px_50px_-32px_rgba(0,51,102,0.55)]">
              <div className="flex items-start justify-between gap-4 bg-navy px-6 py-5 text-white">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-teal">Race bib</p>
                  <p className="mt-1 font-mono text-3xl font-extrabold tracking-wide">{found.ticketId}</p>
                </div>
                {found.attendedAt ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-teal px-3 py-1 text-xs font-bold">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Attended
                  </span>
                ) : (
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">Not yet checked in</span>
                )}
              </div>
              <div className="p-6">
                <h3 className="text-3xl font-extrabold text-navy">{found.fullName}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {found.churchName}
                  {found.churchCode ? ` · ${found.churchCode}` : ""}
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Info label="Age" value={String(found.age)} />
                  <Info label="Sex" value={found.sex === "MALE" ? "Male" : found.sex === "FEMALE" ? "Female" : "—"} />
                  <Info label="Category" value={labelFor(AGE_CATEGORIES, found.ageCategory)} />
                  <Info label="Sando" value={labelFor(SANDO_SIZES, found.sandoSize)} />
                  <Info
                    label="Package"
                    value={labelFor(
                      Object.values(PAYMENT_PACKAGES).map((pkg) => ({ id: pkg.id, label: pkg.label })),
                      found.paymentPackage,
                    )}
                  />
                  <Info label="Payment" value={labelFor(PAYMENT_STATUSES, found.paymentStatus || "PENDING")} />
                  <Info label="Phone" value={found.phone || "—"} />
                </div>
                {found.attendedAt ? (
                  <p className="mt-6 rounded-2xl bg-teal/10 px-4 py-3 text-sm font-semibold text-teal">
                    Already marked as attended
                    {found.attendedAt
                      ? ` · ${new Date(found.attendedAt).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}`
                      : ""}
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={markAttended}
                    disabled={loading}
                    className="mt-6 w-full rounded-full bg-orange py-4 text-sm font-extrabold text-white shadow-lg shadow-orange/30 disabled:opacity-60"
                  >
                    Mark as attendee
                  </button>
                )}
              </div>
            </section>
          ) : (
            <div className="mt-10 rounded-[28px] border border-dashed border-slate-200 px-6 py-16 text-center">
              <p className="text-sm font-semibold text-slate-400">No runner loaded yet</p>
              <p className="mt-1 text-sm text-slate-400">Search a ticket ID to verify identity before check-in.</p>
            </div>
          )}
        </div>

        <aside className="bg-white p-5 lg:p-6">
          <h3 className="font-extrabold text-navy">Recent check-ins</h3>
          <p className="mb-4 text-xs text-slate-500">Latest participants marked as attended</p>
          <ul className="divide-y divide-slate-100">
            {recent.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-bold text-navy">{item.fullName}</p>
                  <p className="text-xs text-slate-500">
                    {item.ticketId} · {item.churchName}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] font-semibold text-teal">
                  {item.attendedAt
                    ? new Date(item.attendedAt).toLocaleTimeString("en-PH", {
                        timeZone: "Asia/Manila",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
                </span>
              </li>
            ))}
            {recent.length === 0 ? <li className="py-8 text-sm text-slate-400">No check-ins yet.</li> : null}
          </ul>

          <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
            <p className="text-[11px] font-semibold text-slate-500">
              {totalAttended === 0
                ? "No check-ins"
                : `Page ${recentPage} of ${recentTotalPages} · ${totalAttended} total`}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRecentPage((p) => Math.max(1, p - 1))}
                disabled={recentPage <= 1}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-extrabold text-navy disabled:opacity-40"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => setRecentPage((p) => Math.min(recentTotalPages, p + 1))}
                disabled={recentPage >= recentTotalPages}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-extrabold text-navy disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-navy">{value}</p>
    </div>
  );
}
