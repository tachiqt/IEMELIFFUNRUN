"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { BarChart3, ClipboardCheck, Clock3, LogOut, Users } from "lucide-react";

const LINKS = [
  { href: "/admin", label: "Analytics", icon: BarChart3 },
  { href: "/admin/schedule", label: "Schedule", icon: Clock3 },
  { href: "/admin/registrations", label: "Registrations", icon: Users },
  { href: "/admin/attendance", label: "Attendance", icon: ClipboardCheck },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/admin/login") {
    return children;
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-sand">
      <aside className="border-b border-white/10 bg-navy text-white lg:fixed lg:inset-y-0 lg:w-56 lg:border-b-0">
        <div className="flex items-center gap-3 px-5 py-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/adminlogo.jpg" alt="AGOS admin" className="h-12 w-12 rounded-xl object-cover" />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal">AGOS 2026</p>
            <h1 className="mt-1 text-lg font-extrabold">Admin</h1>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold ${
                  active ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 pb-4">
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/60 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>
      <div className="lg:pl-56">
        <div className="w-full">{children}</div>
      </div>
    </div>
  );
}
