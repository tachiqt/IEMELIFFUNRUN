"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, LockKeyhole, MapPin, ShieldCheck } from "lucide-react";
import { Field } from "@/components/Field";
import { EVENT } from "@/lib/constants";

const loginInputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base font-medium text-navy outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-teal focus:ring-4 focus:ring-teal/15";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed.");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.15fr_1fr]">
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-navy-deep via-navy to-[#014f7a] px-12 py-14 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-teal/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-10 h-72 w-72 rounded-full bg-orange/20 blur-3xl" />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-teal">District 4 East</p>
          <h1 className="mt-6 max-w-xl text-5xl font-extrabold leading-tight tracking-tight xl:text-6xl">
            AGOS 2026
            <span className="mt-2 block text-white/80">Admin console</span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-white/70">{EVENT.tagline}</p>
        </div>
        <div className="relative grid max-w-xl gap-3">
          <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-5 py-4 backdrop-blur-sm">
            <Calendar className="h-5 w-5 text-teal" />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">Event date</p>
              <p className="mt-1 font-semibold">{EVENT.dateLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-5 py-4 backdrop-blur-sm">
            <MapPin className="h-5 w-5 text-orange" />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">Venue</p>
              <p className="mt-1 font-semibold">{EVENT.location}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center bg-sand px-6 py-10 sm:px-10 lg:px-16">
        <form onSubmit={onSubmit} className="w-full max-w-xl">
          <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-navy text-white shadow-lg shadow-navy/20 lg:hidden">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-teal">AGOS Family Run 2026</p>
          <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-navy sm:text-5xl">Sign in</h2>
          <p className="mt-3 max-w-md text-base leading-7 text-slate-500">
            Access analytics, registrations, payment proofs, and attendance check-in.
          </p>

          <div className="mt-10 space-y-6">
            <Field label="Email" required>
              <input
                className={loginInputClass}
                type="email"
                autoComplete="username"
                placeholder="tickets.agos2026@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Password" required>
              <input
                className={loginInputClass}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
          </div>

          {error ? <p className="mt-5 text-sm font-semibold text-orange">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-navy py-4 text-base font-extrabold text-white shadow-lg shadow-navy/20 transition hover:brightness-110 disabled:opacity-60"
          >
            <LockKeyhole className="h-5 w-5" />
            {loading ? "Signing in..." : "Sign in to admin"}
          </button>
        </form>
      </section>
    </main>
  );
}
