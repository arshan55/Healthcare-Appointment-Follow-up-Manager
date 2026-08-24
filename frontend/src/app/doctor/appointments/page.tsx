"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
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

export default function DoctorAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    api.appointments().then((r: { appointments: Appointment[] }) => setAppointments(r.appointments || []));
  }, []);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      <PageHeader title="Visits" subtitle="All scheduled visits." />
      <BentoCard>
        {appointments.length === 0 ? (
          <p className="py-8 text-center text-sm font-medium text-[var(--muted)]">No visits yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Patient</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((apt) => (
                  <motion.tr key={apt.id} variants={item}>
                    <td className="text-sm font-medium text-[var(--ink)]">
                      {new Date(apt.slotStart).toLocaleString([], {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="text-sm text-[var(--muted)]">{apt.patient?.name}</td>
                    <td>
                      <StatusBadge status={apt.status} />
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

