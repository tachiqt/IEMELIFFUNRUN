"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Search, Trash2, Upload, X } from "lucide-react";
import { ExportButton } from "@/components/ExportButton";
import { AGE_CATEGORIES, PAYMENT_PACKAGES, PAYMENT_STATUSES, SANDO_SIZES } from "@/lib/constants";

type PaymentStatus = "PENDING" | "VALID" | "DENIED";
type ListFilter = "ALL" | PaymentStatus | "PAY_LATER";

type Item = {
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
  balance: number;
  isPayLater: boolean;
  paymentMode: "FULL" | "CASH" | "PAY_LATER" | string;
  churchCode: string;
  churchName: string;
  otherChurchName: string | null;
  paymentStatus: PaymentStatus;
  paymentReviewedAt: string | null;
  attendedAt: string | null;
  createdAt: string;
  hasProof: boolean;
};

type Counts = { all: number; PENDING: number; VALID: number; DENIED: number; PAY_LATER: number };

function paymentMethodLabel(mode: string) {
  if (mode === "CASH") return "Cash";
  if (mode === "PAY_LATER") return "Pay Later";
  return "Online";
}

function labelFor<T extends { id: string; label: string }>(items: readonly T[], id: string) {
  return items.find((item) => item.id === id)?.label ?? id.replaceAll("_", " ");
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-sand/80 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-navy">{value || "—"}</p>
    </div>
  );
}

function statusClass(status: PaymentStatus) {
  if (status === "VALID") return "bg-emerald-100 text-emerald-700";
  if (status === "DENIED") return "bg-red-100 text-red-700";
  return "bg-orange/15 text-orange";
}

function StatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold ${statusClass(status)}`}>
      {labelFor(PAYMENT_STATUSES, status)}
    </span>
  );
}

function VerifyButtons({
  status,
  disabled,
  onChange,
}: {
  status: PaymentStatus;
  disabled: boolean;
  onChange: (status: PaymentStatus) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("PENDING")}
        className={`rounded-2xl px-3 py-3 text-sm font-extrabold disabled:opacity-60 ${
          status === "PENDING" ? "bg-orange text-white" : "border border-orange/30 bg-orange/10 text-orange"
        }`}
      >
        Pending
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("VALID")}
        className={`rounded-2xl px-3 py-3 text-sm font-extrabold disabled:opacity-60 ${
          status === "VALID" ? "bg-emerald-600 text-white" : "border border-emerald-200 bg-emerald-50 text-emerald-700"
        }`}
      >
        Valid
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("DENIED")}
        className={`rounded-2xl px-3 py-3 text-sm font-extrabold disabled:opacity-60 ${
          status === "DENIED" ? "bg-red-600 text-white" : "border border-red-200 bg-red-50 text-red-700"
        }`}
      >
        Deny
      </button>
    </div>
  );
}

function ProofViewer({
  title,
  loading,
  url,
}: {
  title: string;
  loading: boolean;
  url: string | null;
}) {
  const isPdf = Boolean(url && (url.toLowerCase().includes(".pdf") || url.toLowerCase().includes("application/pdf")));
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{title}</h4>
      <div className="mt-4 flex min-h-[280px] flex-1 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {loading ? (
          <p className="text-sm text-slate-500">Loading proof...</p>
        ) : url ? (
          isPdf ? (
            <iframe title={`${title} PDF`} src={url} className="h-full min-h-[280px] w-full" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={title} className="max-h-full max-w-full object-contain p-4" />
          )
        ) : (
          <p className="text-sm text-slate-500">Proof is not available.</p>
        )}
      </div>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="mt-3 self-start text-sm font-bold text-teal hover:underline">
          Open proof in a new tab
        </a>
      ) : null}
    </div>
  );
}

export default function RegistrationsPage() {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<ListFilter>("ALL");
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [counts, setCounts] = useState<Counts>({ all: 0, PENDING: 0, VALID: 0, DENIED: 0, PAY_LATER: 0 });
  const [selected, setSelected] = useState<Item | null>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [proofLoading, setProofLoading] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [amountPaidInput, setAmountPaidInput] = useState("");

  useEffect(() => {
    setPage(1);
  }, [q, statusFilter]);

  useEffect(() => {
    const handle = setTimeout(() => {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (statusFilter === "PAY_LATER") params.set("mode", "PAY_LATER");
      else if (statusFilter !== "ALL") params.set("status", statusFilter);
      params.set("page", String(page));
      fetch(`/api/admin/registrations?${params.toString()}`)
        .then((res) => res.json())
        .then((data) => {
          setItems(data.items ?? []);
          setTotal(data.total ?? 0);
          setTotalPages(data.totalPages ?? 1);
          setCounts(data.counts ?? { all: 0, PENDING: 0, VALID: 0, DENIED: 0, PAY_LATER: 0 });
        })
        .catch(() => undefined);
    }, 250);
    return () => clearTimeout(handle);
  }, [q, statusFilter, page]);

  useEffect(() => {
    if (!selected) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  function applyItem(updated: Item) {
    setItems((prev) => {
      if (statusFilter === "PAY_LATER") {
        if (!updated.isPayLater) return prev.filter((item) => item.id !== updated.id);
        return prev.map((item) => (item.id === updated.id ? updated : item));
      }
      if (statusFilter !== "ALL" && statusFilter !== updated.paymentStatus) {
        return prev.filter((item) => item.id !== updated.id);
      }
      return prev.map((item) => (item.id === updated.id ? updated : item));
    });
    if (statusFilter === "PAY_LATER" && !updated.isPayLater) {
      setTotal((n) => Math.max(0, n - 1));
      setCounts((prev) => ({ ...prev, PAY_LATER: Math.max(0, prev.PAY_LATER - 1) }));
    } else if (statusFilter !== "ALL" && statusFilter !== "PAY_LATER" && statusFilter !== updated.paymentStatus) {
      setTotal((n) => Math.max(0, n - 1));
    }
    setSelected((prev) => (prev?.id === updated.id ? updated : prev));
    setAmountPaidInput(String(updated.amountPaid ?? 0));
  }

  async function openRecord(item: Item) {
    setSelected(item);
    setAmountPaidInput(String(item.amountPaid ?? 0));
    setProofUrl(null);
    if (!item.hasProof) {
      setProofLoading(false);
      return;
    }
    setProofLoading(true);
    try {
      const res = await fetch(`/api/admin/proof?id=${item.id}`);
      const data = await res.json();
      if (res.ok) setProofUrl(data.url);
    } finally {
      setProofLoading(false);
    }
  }

  async function patchStatus(body: Record<string, string>, fromStatus?: PaymentStatus) {
    if (!selected || savingStatus) return;
    setSavingStatus(true);
    try {
      const res = await fetch("/api/admin/registrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.id, ...body }),
      });
      const data = await res.json();
      if (res.ok && data.item) {
        applyItem(data.item);
        if (fromStatus && body.paymentStatus && fromStatus !== body.paymentStatus) {
          setCounts((prev) => {
            const next = { ...prev };
            next[fromStatus] = Math.max(0, next[fromStatus] - 1);
            next[body.paymentStatus as PaymentStatus] += 1;
            return next;
          });
        }
      }
    } finally {
      setSavingStatus(false);
    }
  }

  async function uploadProof(file: File | null) {
    if (!selected || !file || uploadingProof) return;
    setUploadingProof(true);
    try {
      const payload = new FormData();
      payload.set("id", selected.id);
      payload.set("paymentProof", file);
      const res = await fetch("/api/admin/proof", { method: "POST", body: payload });
      const data = await res.json();
      if (!res.ok) {
        window.alert(data.error || "Could not upload the payment proof.");
        return;
      }
      if (data.item) applyItem(data.item);
      if (data.url) setProofUrl(data.url);
    } finally {
      setUploadingProof(false);
    }
  }

  async function deleteRecord(item: Item) {
    const ticket = item.ticketId;
    const confirmed = window.confirm(
      `Delete ${item.fullName} (${ticket})?\n\nThis cannot be undone. The ticket number ${ticket} will be reused by the next registration from the same congregation.`,
    );
    if (!confirmed || deleting) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/registrations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        window.alert(data.error || "Could not delete this registration.");
        return;
      }
      setItems((prev) => prev.filter((row) => row.id !== item.id));
      setTotal((n) => Math.max(0, n - 1));
      setCounts((prev) => ({
        ...prev,
        all: Math.max(0, prev.all - 1),
        [item.paymentStatus]: Math.max(0, prev[item.paymentStatus] - 1),
      }));
      if (selected?.id === item.id) setSelected(null);
    } finally {
      setDeleting(false);
    }
  }

  const filters: Array<{ id: ListFilter; label: string; count: number }> = [
    { id: "ALL", label: "All", count: counts.all },
    { id: "PENDING", label: "Pending", count: counts.PENDING },
    { id: "PAY_LATER", label: "Pay Later", count: counts.PAY_LATER },
    { id: "VALID", label: "Valid", count: counts.VALID },
    { id: "DENIED", label: "Denied", count: counts.DENIED },
  ];

  const payLaterView = statusFilter === "PAY_LATER";

  return (
    <div>
      <div className="flex flex-col gap-4 border-b border-slate-200/70 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-navy">Registrations</h2>
          <p className="text-sm text-slate-500">{total} matching records</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <label className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-full border border-slate-200 bg-sand py-3 pl-11 pr-4 text-sm font-medium text-navy outline-none focus:border-teal focus:ring-4 focus:ring-teal/15"
              placeholder="Search name, ticket ID, church, phone, or Facebook"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
          <ExportButton
            href={`/api/admin/export/registrations${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`}
            label="Export Excel"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200/70 bg-white px-4 py-3">
        {filters.map((filter) => {
          const active = statusFilter === filter.id;
          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => setStatusFilter(filter.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${
                active ? "bg-navy text-white" : "bg-sand text-navy/70 hover:bg-slate-100"
              }`}
            >
              {filter.label} {filter.count}
            </button>
          );
        })}
      </div>

      <div className="overflow-x-auto bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-sand text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Ticket</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Church</th>
              <th className="px-4 py-3">{payLaterView ? "Type" : "Package"}</th>
              {payLaterView ? (
                <>
                  <th className="px-4 py-3">Total fee</th>
                  <th className="px-4 py-3">Paid</th>
                  <th className="px-4 py-3">Balance</th>
                </>
              ) : (
                <>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Size</th>
                </>
              )}
              <th className="px-4 py-3">Payment</th>
              {!payLaterView ? <th className="px-4 py-3">Attended</th> : null}
              <th className="px-4 py-3">Record</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-slate-100 hover:bg-sand/50">
                <td className="px-4 py-3 font-bold text-navy">{item.ticketId}</td>
                <td className="px-4 py-3">
                  <div className="font-semibold">{item.fullName}</div>
                  <div className="text-xs text-slate-500">{item.phone}</div>
                </td>
                <td className="px-4 py-3">
                  {item.otherChurchName || item.churchName}
                  <div className="text-xs text-slate-400">{item.churchCode}</div>
                </td>
                <td className="px-4 py-3">
                  {labelFor(
                    Object.values(PAYMENT_PACKAGES).map((pkg) => ({ id: pkg.id, label: pkg.label })),
                    item.paymentPackage,
                  )}
                  {!payLaterView ? ` ₱${item.amount}` : null}
                </td>
                {payLaterView ? (
                  <>
                    <td className="px-4 py-3 font-semibold text-navy">₱{item.amount}</td>
                    <td className="px-4 py-3 font-semibold text-navy">₱{item.amountPaid ?? 0}</td>
                    <td className="px-4 py-3 font-semibold text-orange">₱{item.balance ?? Math.max(0, item.amount - (item.amountPaid ?? 0))}</td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold ${
                          item.paymentMode === "CASH"
                            ? "bg-orange/15 text-orange"
                            : item.paymentMode === "PAY_LATER"
                              ? "bg-teal/15 text-teal"
                              : "bg-navy/10 text-navy"
                        }`}
                      >
                        {paymentMethodLabel(item.paymentMode)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-navy">{labelFor(SANDO_SIZES, item.sandoSize)}</td>
                  </>
                )}
                <td className="px-4 py-3">
                  <StatusBadge status={item.paymentStatus} />
                </td>
                {!payLaterView ? (
                  <td className="px-4 py-3">
                    {item.attendedAt ? (
                      <span className="rounded-full bg-teal/10 px-2.5 py-1 text-xs font-bold text-teal">Yes</span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">No</span>
                    )}
                  </td>
                ) : null}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => openRecord(item)} className="font-bold text-teal hover:underline">
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteRecord(item)}
                      disabled={deleting}
                      className="font-bold text-red-600 hover:underline disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={payLaterView ? 8 : 9} className="px-4 py-10 text-center text-sm text-slate-500">
                  No registrations match this search.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200/70 bg-white px-4 py-4 sm:flex-row">
        <p className="text-xs font-semibold text-slate-500">
          {total === 0
            ? "No records"
            : `Showing ${(page - 1) * 20 + 1}–${Math.min(page * 20, total)} of ${total} · Page ${page} of ${totalPages}`}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-extrabold text-navy disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Previous
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-extrabold text-navy disabled:opacity-40"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-navy-deep/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setSelected(null)}>
          <div
            className="flex h-full w-full max-w-[1400px] flex-col overflow-hidden bg-white shadow-[0_40px_80px_-24px_rgba(0,26,51,0.55)] sm:h-[92vh] sm:rounded-[28px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-navy px-5 py-4 text-white sm:px-7">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal">{selected.ticketId}</p>
                <h3 className="mt-1 text-2xl font-extrabold sm:text-3xl">{selected.fullName}</h3>
                <p className="mt-1 text-sm text-white/70">
                  {selected.otherChurchName || selected.churchName} · {selected.churchCode}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-full bg-white/15 px-2.5 py-1 text-xs font-extrabold">
                    {paymentMethodLabel(selected.paymentMode)}
                  </span>
                  <span className="inline-flex rounded-full bg-white/15 px-2.5 py-1 text-xs font-extrabold">
                    {labelFor(SANDO_SIZES, selected.sandoSize)}
                  </span>
                  <StatusBadge status={selected.paymentStatus} />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-full bg-white/10 p-2 hover:bg-white/20"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(320px,0.9fr)_1.2fr]">
              <div className="overflow-y-auto border-b border-slate-100 p-5 sm:p-7 lg:border-b-0 lg:border-r">
                <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Participant details</h4>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Detail label="Age" value={String(selected.age)} />
                  <Detail label="Biological sex" value={selected.sex === "MALE" ? "Male" : "Female"} />
                  <Detail label="Phone" value={selected.phone} />
                  <Detail label="Facebook" value={selected.facebook} />
                  <Detail label="Category" value={labelFor(AGE_CATEGORIES, selected.ageCategory)} />
                  <Detail
                    label="Package"
                    value={`${labelFor(
                      Object.values(PAYMENT_PACKAGES).map((pkg) => ({ id: pkg.id, label: pkg.label })),
                      selected.paymentPackage,
                    )} — ₱${selected.amount}`}
                  />
                  <Detail label="Attendance" value={selected.attendedAt ? "Checked in" : "Not yet"} />
                  <Detail
                    label="Registered"
                    value={new Date(selected.createdAt).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}
                  />
                </div>

                <h4 className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Payment method</h4>
                <p className="mt-2 text-sm text-slate-500">Switch method if the participant paid differently.</p>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    disabled={savingStatus}
                    onClick={() => patchStatus({ paymentMode: "FULL" })}
                    className={`rounded-2xl px-3 py-3 text-sm font-extrabold disabled:opacity-60 ${
                      selected.paymentMode === "FULL"
                        ? "bg-navy text-white"
                        : "border border-slate-200 bg-white text-navy/70 hover:bg-sand"
                    }`}
                  >
                    Online
                  </button>
                  <button
                    type="button"
                    disabled={savingStatus}
                    onClick={() => patchStatus({ paymentMode: "CASH" })}
                    className={`rounded-2xl px-3 py-3 text-sm font-extrabold disabled:opacity-60 ${
                      selected.paymentMode === "CASH"
                        ? "bg-orange text-white"
                        : "border border-orange/30 bg-orange/10 text-orange"
                    }`}
                  >
                    Cash
                  </button>
                  <button
                    type="button"
                    disabled={savingStatus}
                    onClick={() => patchStatus({ paymentMode: "PAY_LATER" })}
                    className={`rounded-2xl px-3 py-3 text-sm font-extrabold disabled:opacity-60 ${
                      selected.paymentMode === "PAY_LATER"
                        ? "bg-teal text-white"
                        : "border border-teal/30 bg-teal/10 text-teal"
                    }`}
                  >
                    Pay Later
                  </button>
                </div>

                {selected.paymentMode === "PAY_LATER" ? (
                  <div className="mt-8">
                    <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Pay Later balance</h4>
                    <p className="mt-2 text-sm text-slate-500">
                      Total ₱{selected.amount}. Paid ₱{selected.amountPaid ?? 0}. Remaining ₱
                      {selected.balance ?? Math.max(0, selected.amount - (selected.amountPaid ?? 0))}.
                    </p>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                      <input
                        type="number"
                        min={0}
                        max={selected.amount}
                        value={amountPaidInput}
                        onChange={(e) => setAmountPaidInput(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-sand px-4 py-3 text-sm font-semibold text-navy outline-none focus:border-teal focus:ring-4 focus:ring-teal/15 sm:max-w-[180px]"
                      />
                      <button
                        type="button"
                        disabled={savingStatus}
                        onClick={() => patchStatus({ amountPaid: amountPaidInput })}
                        className="rounded-2xl bg-navy px-4 py-3 text-sm font-extrabold text-white disabled:opacity-60"
                      >
                        Update paid
                      </button>
                      <button
                        type="button"
                        disabled={savingStatus}
                        onClick={() => patchStatus({ markFullyPaid: "true" })}
                        className="rounded-2xl bg-teal px-4 py-3 text-sm font-extrabold text-white disabled:opacity-60"
                      >
                        Mark fully paid
                      </button>
                    </div>
                  </div>
                ) : null}

                <h4 className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Sando size</h4>
                <p className="mt-2 text-sm text-slate-500">Change the size if the participant requested a different fit.</p>
                <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-4">
                  {SANDO_SIZES.map((size) => {
                    const active = selected.sandoSize === size.id;
                    return (
                      <button
                        key={size.id}
                        type="button"
                        disabled={savingStatus}
                        onClick={() => patchStatus({ sandoSize: size.id })}
                        className={`rounded-2xl px-2 py-3 text-xs font-extrabold disabled:opacity-60 ${
                          active ? "bg-navy text-white" : "border border-slate-200 bg-white text-navy/70 hover:bg-sand"
                        }`}
                      >
                        {size.label}
                      </button>
                    );
                  })}
                </div>

                <h4 className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Payment</h4>
                <p className="mt-2 text-sm text-slate-500">Review the proof, then mark Valid or Deny.</p>
                <div className="mt-4">
                  <VerifyButtons
                    status={selected.paymentStatus}
                    disabled={savingStatus}
                    onChange={(status) => patchStatus({ paymentStatus: status }, selected.paymentStatus)}
                  />
                </div>

                <h4 className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Danger zone</h4>
                <p className="mt-2 text-sm text-slate-500">
                  Deleting this record frees ticket {selected.ticketId} for the next registration from the same congregation.
                </p>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => deleteRecord(selected)}
                  className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-extrabold text-red-700 disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  {deleting ? "Deleting..." : "Delete registration"}
                </button>
              </div>

              <div className="flex min-h-[50vh] flex-col gap-8 overflow-y-auto bg-sand/60 p-5 sm:p-7">
                {selected.hasProof ? (
                  <ProofViewer title="Payment proof" loading={proofLoading} url={proofUrl} />
                ) : (
                  <div className="flex min-h-[280px] flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-orange/30 bg-orange/[0.06] px-6 text-center">
                    <p className="text-sm font-extrabold text-orange">No proof uploaded</p>
                    <p className="mt-2 max-w-sm text-sm leading-6 text-navy/70">
                      Upload a receipt or acknowledgment photo so this registration can be verified.
                    </p>
                  </div>
                )}
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-teal/30 bg-white px-6 py-8 text-center transition hover:border-teal hover:bg-teal/[0.04]">
                  <Upload className="h-7 w-7 text-teal" />
                  <span className="mt-3 text-sm font-bold text-navy">
                    {uploadingProof
                      ? "Uploading..."
                      : selected.hasProof
                        ? "Replace payment proof"
                        : "Upload payment proof"}
                  </span>
                  <span className="mt-1 text-xs text-slate-500">JPG, PNG, or PDF. Max 10 MB.</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="sr-only"
                    disabled={uploadingProof}
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      e.target.value = "";
                      uploadProof(file).catch(() => undefined);
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
