import Link from "next/link";

export default function NotFound() {
  return (
    <main className="wave-bg flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-teal">AGOS 2026</p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-navy">Page not found</h1>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        If you just registered, double-check your ticket ID. You can always fill out the form again.
      </p>
      <Link href="/" className="mt-6 rounded-full bg-orange px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-orange/30">
        Back to registration
      </Link>
    </main>
  );
}
