"use client";

import { motion } from "framer-motion";
import { useMemo, useEffect, useState } from "react";
import api from "@/lib/api";
import type { Appointment } from "@/lib/types";
import { BentoCard, PageHeader, StatusBadge } from "@/components/ui";
import { ease } from "@/lib/motion";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease } },
};

export default function DoctorDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    api.appointments().then((r: { appointments: Appointment[] }) => setAppointments(r.appointments || []));
  }, []);

  const today = useMemo(() => {
    const d = new Date().toDateString();
    return appointments
      .filter((a) => new Date(a.slotStart).toDateString() === d)
      .sort((a, b) => +new Date(a.slotStart) - +new Date(b.slotStart));
  }, [appointments]);

  const week = useMemo(() => {
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 7);
    return appointments.filter((a) => {
      const t = new Date(a.slotStart);
      return t >= start && t <= end;
    });
  }, [appointments]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <motion.div variants={stagger} initial="hidden" animate="show">
        <PageHeader title="Today" subtitle={`${today.length} visits`} />
        <div className="space-y-3">
          {today.length === 0 && (
            <BentoCard>
              <p className="py-6 text-center text-sm font-medium text-[var(--muted)]">Nothing on the board today.</p>
            </BentoCard>
          )}
          {today.map((apt) => (
            <motion.a
              key={apt.id}
              href={`/doctor/appointments/${apt.id}`}
              variants={item}
              className="flex items-start justify-between rounded-[var(--radius-sm)] border border-[var(--line)] bg-white p-4 transition-colors hover:border-[var(--teal)]"
            >
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--teal)]">
                  {new Date(apt.slotStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
                <p className="mt-1 font-semibold text-[var(--ink)]">{apt.patient?.name}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {apt.preVisit?.chiefComplaint || apt.symptomForm?.symptoms?.slice(0, 80)}
                </p>
              </div>
              <StatusBadge status={apt.status} />
            </motion.a>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
      >
        <h2 className="mb-3 text-lg font-bold text-[var(--ink)]">Next 7 days</h2>
        <BentoCard>
          <div className="space-y-3">
            {week.map((apt) => (
              <div key={apt.id} className="flex items-center justify-between rounded-[var(--radius-sm)] bg-[var(--bg)] px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-[var(--ink)]">
                    {new Date(apt.slotStart).toLocaleString([], {
                      weekday: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-xs text-[var(--muted)]">{apt.patient?.name}</p>
                </div>
                <StatusBadge status={apt.status} />
              </div>
            ))}
            {week.length === 0 && (
              <p className="py-4 text-center text-sm font-medium text-[var(--muted)]">No upcoming visits.</p>
            )}
          </div>
        </BentoCard>
      </motion.div>
    </div>
  );
}

