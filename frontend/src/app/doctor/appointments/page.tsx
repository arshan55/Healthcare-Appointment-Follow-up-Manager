"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import type { Appointment } from "@/lib/types";
import { BentoCard, PageHeader, StatusBadge, TextLink } from "@/components/ui";
import { ease } from "@/lib/motion";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease } },
};

type Filter = "all" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NEEDS_RESCHEDULE";

export default function DoctorAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    api.appointments().then((r: { appointments: Appointment[] }) => setAppointments(r.appointments || []));
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return appointments;
    return appointments.filter((a) => a.status === filter);
  }, [appointments, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: appointments.length };
    appointments.forEach((a) => {
      c[a.status] = (c[a.status] || 0) + 1;
    });
    return c;
  }, [appointments]);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      <PageHeader title="My Patients" subtitle={`${appointments.length} total visits.`} />

      <BentoCard className="mb-5">
        <div className="flex flex-wrap gap-2">
          {(["all", "CONFIRMED", "COMPLETED", "NEEDS_RESCHEDULE", "CANCELLED"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                filter === f
                  ? "bg-[var(--teal)] text-white"
                  : "bg-[var(--bg)] text-[var(--muted)] hover:bg-[var(--teal-glow)]"
              }`}
            >
              {f === "all" ? "All" : f.replace("_", " ")} ({counts[f] || 0})
            </button>
          ))}
        </div>
      </BentoCard>

      <BentoCard>
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm font-medium text-[var(--muted)]">No visits found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Contact</th>
                  <th>When</th>
                  <th>Status</th>
                  <th>Urgency</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((apt) => (
                  <motion.tr key={apt.id} variants={item}>
                    <td>
                      <p className="text-sm font-semibold text-[var(--ink)]">{apt.patient?.name}</p>
                      <p className="text-xs text-[var(--muted)]">{apt.preVisit?.chiefComplaint || apt.symptomForm?.symptoms?.slice(0, 50)}</p>
                    </td>
                    <td className="text-sm text-[var(--muted)]">{apt.patient?.email}</td>
                    <td className="text-sm font-medium text-[var(--ink)]">
                      {new Date(apt.slotStart).toLocaleString([], {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td>
                      <StatusBadge status={apt.status} />
                    </td>
                    <td>
                      {apt.preVisit?.urgency && <StatusBadge status={apt.preVisit.urgency} />}
                    </td>
                    <td>
                      <TextLink href={`/doctor/appointments/${apt.id}`}>Open</TextLink>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </BentoCard>
    </motion.div>
  );
}

