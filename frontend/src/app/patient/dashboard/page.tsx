"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import type { Appointment, Doctor } from "@/lib/types";
import {
  BentoCard,
  BentoGrid,
  Button,
  Card,
  PageHeader,
  SlotPill,
  StatusBadge,
  TextLink,
} from "@/components/ui";
import { ease } from "@/lib/motion";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
};

export default function PatientDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  useEffect(() => {
    Promise.all([
      api.appointments().then((r: { appointments: Appointment[] }) => r.appointments || []),
      api.doctors().then((r: { doctors: Doctor[] }) => r.doctors || []),
    ]).then(([apts, docs]) => {
      setAppointments(apts);
      setDoctors(docs);
    });
  }, []);

  const upcoming = appointments.filter(
    (a) => new Date(a.slotStart) > new Date() && ["CONFIRMED", "HELD", "NEEDS_RESCHEDULE"].includes(a.status)
  );

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      <PageHeader
        title="Your visits"
        subtitle="Upcoming times, summaries, and anything that needs a new slot."
        action={
          <Link href="/patient/browse-doctors">
            <Button>Book a visit</Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <motion.div variants={item} className="lg:col-span-2">
          <BentoCard span={2}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--ink)]">Upcoming</h2>
              <span className="text-xs font-semibold text-[var(--muted)]">
                {upcoming.length} {upcoming.length === 1 ? "visit" : "visits"}
              </span>
            </div>
            {upcoming.length === 0 ? (
              <p className="text-sm font-medium text-[var(--muted)]">No upcoming visits.</p>
            ) : (
              <div className="space-y-3">
                {upcoming.map((apt) => (
                  <motion.div
                    key={apt.id}
                    whileHover={{ x: 4 }}
                    className="flex items-center justify-between rounded-[var(--radius-sm)] border border-[var(--line)] bg-white p-4 transition-colors hover:border-[var(--teal)]"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[var(--ink)]">{apt.doctor?.user.name}</p>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {new Date(apt.slotStart).toLocaleString([], {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={apt.status} />
                      <TextLink href={`/patient/appointments/${apt.id}`}>Open</TextLink>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </BentoCard>
        </motion.div>

        <motion.div variants={item} className="space-y-4">
          <BentoCard>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--muted)]">Quick actions</h3>
            <div className="mt-4 space-y-2">
              <Link href="/patient/browse-doctors" className="block">
                <Button variant="ghost" className="w-full justify-start">
                  Find a clinician
                </Button>
              </Link>
              <Link href="/patient/my-appointments" className="block">
                <Button variant="ghost" className="w-full justify-start">
                  All visits
                </Button>
              </Link>
              <Link href="/settings/calendar" className="block">
                <Button variant="ghost" className="w-full justify-start">
                  Calendar settings
                </Button>
              </Link>
            </div>
          </BentoCard>

          <BentoCard>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--muted)]">Clinicians</h3>
            <div className="mt-4 space-y-3">
              {doctors.slice(0, 3).map((d) => (
                <Link key={d.id} href={`/patient/book-appointment/${d.id}`} className="flex items-center justify-between rounded-[var(--radius-sm)] border border-[var(--line)] p-3 transition-colors hover:border-[var(--teal)]">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--ink)]">{d.user.name}</p>
                    <p className="text-xs text-[var(--muted)]">{d.specialization}</p>
                  </div>
                  <span className="text-xs font-semibold text-[var(--teal)]">{d.slotDuration}m</span>
                </Link>
              ))}
              {doctors.length === 0 && (
                <p className="text-sm font-medium text-[var(--muted)]">No clinicians available.</p>
              )}
            </div>
          </BentoCard>
        </motion.div>
      </div>
    </motion.div>
  );
}
