"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CalendarClock,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Stethoscope,
  Users,
  X,
  Heart,
  Activity,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { Role } from "@/lib/types";
import { ease } from "@/lib/motion";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

const NAV: Record<Role, NavItem[]> = {
  PATIENT: [
    { href: "/patient/dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
    { href: "/patient/browse-doctors", label: "Find Doctors", icon: <Stethoscope size={20} /> },
    { href: "/patient/my-appointments", label: "My Visits", icon: <ClipboardList size={20} /> },
    { href: "/settings/calendar", label: "Calendar", icon: <CalendarClock size={20} /> },
  ],
  DOCTOR: [
    { href: "/doctor/dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
    { href: "/doctor/appointments", label: "My Patients", icon: <Users size={20} /> },
    { href: "/settings/calendar", label: "Calendar", icon: <CalendarClock size={20} /> },
  ],
  ADMIN: [
    { href: "/admin/dashboard", label: "Overview", icon: <LayoutDashboard size={20} /> },
    { href: "/admin/doctors", label: "Doctors", icon: <Stethoscope size={20} /> },
    { href: "/admin/appointments", label: "Appointments", icon: <ClipboardList size={20} /> },
    { href: "/admin/users", label: "People", icon: <Users size={20} /> },
  ],
};

const ROLE_LABELS: Record<Role, string> = {
  PATIENT: "Patient Portal",
  DOCTOR: "Doctor Portal",
  ADMIN: "Admin Portal",
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { scrollY } = useScroll();
  const headerOpacity = useTransform(scrollY, [0, 50], [0.95, 0.98]);
  const headerBlur = useTransform(scrollY, [0, 50], [8, 16]);

  useEffect(() => {
    if (!loading && (!user || user.role !== role)) router.push("/login");
  }, [user, loading, role, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="h-12 w-12 rounded-full border-2 border-[var(--line)] border-t-[var(--primary)]"
          />
          <p className="text-sm font-medium text-[var(--muted)]">Loading your experience...</p>
        </motion.div>
      </div>
    );
  }

  const items = NAV[role];

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-[var(--ease-out)] md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col bg-gradient-to-b from-[#1E2526] to-[#2A3436] text-white">
          {/* Logo */}
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]">
                <Heart size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">Northwell</h1>
                <p className="text-xs text-white/50">{ROLE_LABELS[role]}</p>
              </div>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-1.5 hover:bg-white/10 md:hidden"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-4 py-6">
            <ul className="space-y-1.5">
              {items.map((item, i) => {
                const active = pathname === item.href || (item.href !== `/${role}/dashboard` && pathname.startsWith(item.href));
                return (
                  <motion.li
                    key={item.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.4, ease }}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                        active
                          ? "bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/30"
                          : "text-white/70 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <span className={`transition-transform duration-200 ${active ? "scale-110" : "group-hover:scale-105"}`}>
                        {item.icon}
                      </span>
                      {item.label}
                      {active && (
                        <motion.div
                          layoutId="sidebar-active"
                          className="absolute right-3 h-2 w-2 rounded-full bg-white"
                        />
                      )}
                    </Link>
                  </motion.li>
                );
              })}
            </ul>
          </nav>

          {/* User section */}
          <div className="border-t border-white/10 p-4">
            <div className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-bold text-white">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold">{user.name}</p>
                <p className="truncate text-xs text-white/50">{user.email}</p>
              </div>
            </div>
            <button
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="mt-3 flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <LogOut size={18} />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="md:pl-72">
        {/* Top header */}
        <motion.header
          style={{ opacity: headerOpacity }}
          className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--bg)]/80 backdrop-blur-xl"
        >
          <div className="flex items-center justify-between px-4 py-3 md:px-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="rounded-lg p-2 hover:bg-[var(--bg-warm)] md:hidden"
              >
                <Menu size={20} />
              </button>
              <div className="hidden md:block">
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                  {role === "PATIENT" ? "Welcome back" : ROLE_LABELS[role]}
                </p>
                <h2 className="text-lg font-bold text-[var(--ink)]">{user.name}</h2>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-full bg-[var(--success-light)] px-3 py-1.5 sm:flex">
                <Activity size={14} className="text-[var(--success)]" />
                <span className="text-xs font-semibold text-[var(--success)]">Online</span>
              </div>
            </div>
          </div>
        </motion.header>

        {/* Page content */}
        <main className="px-4 py-6 md:px-8 md:py-10">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
