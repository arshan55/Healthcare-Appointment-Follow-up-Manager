"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  CalendarClock,
  ClipboardList,
  LogOut,
  Settings,
  Stethoscope,
  Users,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { Role } from "@/lib/types";
import { ease } from "@/lib/motion";

const NAV: Record<Role, { href: string; label: string; icon: React.ReactNode }[]> = {
  PATIENT: [
    { href: "/patient/dashboard", label: "Home", icon: <CalendarClock size={20} /> },
    { href: "/patient/browse-doctors", label: "Book", icon: <Stethoscope size={20} /> },
    { href: "/patient/my-appointments", label: "Visits", icon: <ClipboardList size={20} /> },
    { href: "/settings/calendar", label: "Calendar", icon: <Settings size={20} /> },
  ],
  DOCTOR: [
    { href: "/doctor/dashboard", label: "Schedule", icon: <CalendarClock size={20} /> },
    { href: "/doctor/appointments", label: "Visits", icon: <ClipboardList size={20} /> },
  ],
  ADMIN: [
    { href: "/admin/dashboard", label: "Overview", icon: <CalendarClock size={20} /> },
    { href: "/admin/doctors", label: "Doctors", icon: <Stethoscope size={20} /> },
    { href: "/admin/appointments", label: "Appointments", icon: <ClipboardList size={20} /> },
    { href: "/admin/users", label: "People", icon: <Users size={20} /> },
  ],
};

export default function PortalShell({
  role,
  children,
}: {
  role: Role;
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && (!user || user.role !== role)) router.push("/login");
  }, [user, loading, role, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)]">
        <p className="text-sm font-medium text-[var(--muted)]">Loading…</p>
      </div>
    );
  }

  const items = NAV[role];

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-24 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[rgba(244,247,246,0.85)] backdrop-blur-md">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-5 py-4">
          <Link href="/" className="text-lg font-bold tracking-tight text-[var(--ink)]">
            Northwell Clinic
          </Link>
          <div className="flex items-center gap-3 text-sm font-medium text-[var(--muted)]">
            <span className="hidden sm:inline">{user.name}</span>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-2 transition hover:bg-[var(--teal-glow)] hover:text-[var(--ink)]"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Sign out</span>
            </motion.button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1200px] px-5 py-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
        >
          {children}
        </motion.div>
      </div>

      {/* Floating bottom nav — mobile */}
      <nav className="fixed inset-x-0 bottom-4 z-40 mx-auto max-w-[calc(100%-32px)] md:hidden">
        <div className="flex items-center justify-around rounded-[var(--radius)] border border-[var(--line)] bg-white/80 px-2 py-2 shadow-[var(--shadow-float)] backdrop-blur-xl">
          {items.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 rounded-[var(--radius-sm)] px-3 py-2 text-xs font-semibold transition-all duration-200 ${
                  active ? "text-[var(--teal)]" : "text-[var(--muted)]"
                }`}
              >
                <motion.div
                  animate={active ? { y: -2 } : { y: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    active ? "bg-[var(--teal-glow)] text-[var(--teal)]" : ""
                  }`}
                >
                  {item.icon}
                </motion.div>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function RoleMark({ role }: { role: Role }) {
  const Icon = role === "ADMIN" ? Users : role === "DOCTOR" ? Stethoscope : CalendarClock;
  return <Icon size={16} />;
}

