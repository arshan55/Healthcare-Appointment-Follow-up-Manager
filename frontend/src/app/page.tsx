"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CalendarCheck, ClipboardList, Stethoscope, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { BreathingShape, Button, Card, PageHeader } from "@/components/ui";
import { ease } from "@/lib/motion";

const portals = [
  {
    role: "PATIENT",
    label: "Patient",
    description: "Book visits, share symptoms, view summaries and reminders.",
    href: "/login?role=PATIENT",
    icon: CalendarCheck,
    color: "var(--primary)",
    glow: "var(--primary-light)",
  },
  {
    role: "DOCTOR",
    label: "Doctor",
    description: "Review schedule, pre-visit briefs, and post-visit notes.",
    href: "/login?role=DOCTOR",
    icon: Stethoscope,
    color: "#0F5E5E",
    glow: "#D6EfEf",
  },
  {
    role: "ADMIN",
    label: "Admin",
    description: "Manage clinicians, leave days, appointments, and people.",
    href: "/login?role=ADMIN",
    icon: Users,
    color: "#1A2E2C",
    glow: "#E8EFEE",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
};

const item = {
  hidden: { opacity: 0, y: 30, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.7, ease } },
};

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) return;
    if (user.role === "PATIENT") router.replace("/patient/dashboard");
    if (user.role === "DOCTOR") router.replace("/doctor/dashboard");
    if (user.role === "ADMIN") router.replace("/admin/dashboard");
  }, [user, loading, router]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--bg)]">
      <BreathingShape className="left-[-12%] top-[-12%] h-[700px] w-[700px]" />
      <BreathingShape className="bottom-[-18%] right-[-10%] h-[600px] w-[600px] animate-float-delay" />

      <div className="relative mx-auto max-w-[1200px] px-5 py-6">
        <motion.nav
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
          className="flex items-center justify-between"
        >
          <span className="text-lg font-bold tracking-tight text-[var(--ink)]">Northwell Clinic</span>
          <Link
            href="/login"
            className="text-sm font-semibold text-[var(--teal)] hover:underline underline-offset-4"
          >
            Sign in
          </Link>
        </motion.nav>

        <motion.main
          variants={container}
          initial="hidden"
          animate="show"
          className="mx-auto flex min-h-[calc(100vh-64px)] flex-col justify-center py-16 lg:py-24"
        >
          <motion.div variants={item} className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--teal)]">
              Healthcare platform
            </p>
            <h1 className="mt-5 text-5xl leading-[1.05] text-[var(--ink)] md:text-6xl">
              Choose your portal
            </h1>
            <p className="mt-5 text-lg font-medium text-[var(--muted)]">
              A calm, precise clinical workflow for patients, doctors, and clinic staff.
            </p>
          </motion.div>

          <motion.div variants={container} className="mx-auto mt-12 grid w-full max-w-4xl grid-cols-1 gap-5 sm:grid-cols-3">
            {portals.map((portal) => {
              const Icon = portal.icon;
              return (
                <motion.div key={portal.role} variants={item}>
                  <Link href={portal.href}>
                    <Card
                      hover
                      className="group flex h-full flex-col justify-between p-6 transition-all duration-200 hover:border-[var(--teal)]"
                    >
                      <div>
                        <div
                          className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-[var(--radius-sm)] transition-colors duration-200"
                          style={{ background: portal.glow, color: portal.color }}
                        >
                          <Icon size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-[var(--ink)]">{portal.label}</h3>
                        <p className="mt-2 text-sm font-medium leading-relaxed text-[var(--muted)]">
                          {portal.description}
                        </p>
                      </div>
                      <div className="mt-6 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--teal)] opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                        <span>Enter portal</span>
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M5 12h14" />
                          <path d="m12 5 7 7-7 7" />
                        </svg>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>

          <motion.div variants={item} className="mx-auto mt-16 flex max-w-2xl flex-col items-center gap-4 text-center sm:flex-row sm:justify-between">
            <div className="flex items-center gap-3 text-sm font-medium text-[var(--muted)]">
              <span className="flex h-2 w-2 rounded-full bg-[var(--teal)]" />
              Slot holds with expiry
            </div>
            <div className="flex items-center gap-3 text-sm font-medium text-[var(--muted)]">
              <span className="flex h-2 w-2 rounded-full bg-[var(--teal)]" />
              AI visit summaries
            </div>
            <div className="flex items-center gap-3 text-sm font-medium text-[var(--muted)]">
              <span className="flex h-2 w-2 rounded-full bg-[var(--teal)]" />
              Calendar + email alerts
            </div>
          </motion.div>
        </motion.main>
      </div>
    </div>
  );
}
