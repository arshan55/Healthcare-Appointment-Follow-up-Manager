"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ArrowRight, CalendarCheck, FileText, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { BreathingShape, Button, Card, PageHeader } from "@/components/ui";
import { ease } from "@/lib/motion";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
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
      <BreathingShape className="left-[-10%] top-[-10%] h-[600px] w-[600px]" />
      <BreathingShape className="bottom-[-15%] right-[-8%] h-[500px] w-[500px] animate-float-delay" />

      <div className="relative mx-auto max-w-[1200px] px-5 py-6">
        <motion.nav
          initial={{ opacity: 0, y: -10 }}
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
          variants={stagger}
          initial="hidden"
          animate="show"
          className="mx-auto flex min-h-[calc(100vh-64px)] flex-col justify-center py-16 lg:grid lg:grid-cols-2 lg:gap-16 lg:py-24"
        >
          <div className="max-w-xl">
            <motion.p variants={fadeUp} className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--teal)]">
              Appointments, simplified
            </motion.p>
            <motion.h1
              variants={fadeUp}
              className="mt-5 text-5xl leading-[1.05] text-[var(--ink)] md:text-6xl"
            >
              Book a visit.<br />
              Share symptoms.<br />
              Leave with clarity.
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="mt-6 max-w-lg text-lg font-medium text-[var(--muted)]"
            >
              A calm, precise clinical portal for patients, doctors, and staff.
              Smart scheduling, AI summaries, and follow-up care in one place.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link href="/login">
                <Button>
                  Open demo <ArrowRight size={16} />
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="ghost">Create patient account</Button>
              </Link>
            </motion.div>
          </div>

          <motion.div variants={fadeUp} className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:mt-0">
            {[
              [CalendarCheck, "Fast booking", "Hold a slot while you fill in your symptoms, then confirm."],
              [FileText, "Visit context", "Doctors receive a concise pre-visit brief before you arrive."],
              [ShieldCheck, "Clinical-grade", "End-to-end scheduling, reminders, and follow-up summaries."],
            ].map(([Icon, title, text], i) => (
              <Card key={String(title)} hover className="flex flex-col justify-between p-6">
                <div>
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--teal-glow)] text-[var(--teal)]">
                    <Icon size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-[var(--ink)]">{title as string}</h3>
                  <p className="mt-2 text-sm font-medium text-[var(--muted)]">{text as string}</p>
                </div>
                {i === 0 && (
                  <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-[var(--teal)]">
                    <span className="h-2 w-2 rounded-full bg-[var(--teal)]" />
                    Live availability
                  </div>
                )}
              </Card>
            ))}
          </motion.div>
        </motion.main>
      </div>
    </div>
  );
}

