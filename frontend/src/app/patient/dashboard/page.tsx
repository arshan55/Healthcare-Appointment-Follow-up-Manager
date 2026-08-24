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
import { ScrollReveal, StaggerChildren } from "@/components/ScrollReveal";
import { ease } from "@/lib/motion";
import { Calendar, Clock, User, Stethoscope, ArrowRight } from "lucide-react";

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

  const stats = [
    { label: "Upcoming", value: upcoming.length, icon: <Calendar size={20} />, color: "var(--primary)" },
    { label: "Total Visits", value: appointments.length, icon: <Clock size={20} />, color: "var(--info)" },
    { label: "Doctors", value: doctors.length, icon: <Stethoscope size={20} />, color: "var(--success)" },
  ];

  return (
    <div>
      <PageHeader
        title="Your visits"
        subtitle="Upcoming times, summaries, and anything that needs a new slot."
        action={
          <Link href="/patient/browse-doctors">
            <Button>
              Book a visit
              <ArrowRight size={16} />
            </Button>
          </Link>
        }
      />

      {/* Stats row */}
      <StaggerChildren className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} hover className="p-5">
            <div className="flex items-center gap-4">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ background: `${stat.color}15`, color: stat.color }}
              >
                {stat.icon}
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--ink)]">{stat.value}</p>
                <p className="text-sm text-[var(--muted)]">{stat.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </StaggerChildren>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Upcoming appointments */}
        <div className="lg:col-span-2">
          <ScrollReveal>
            <BentoCard span={2} className="overflow-hidden">
              <div className="border-b border-[var(--line)] p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-[var(--ink)]">Upcoming</h2>
                  <span className="rounded-full bg-[var(--primary-light)] px-3 py-1 text-xs font-bold text-[var(--primary)]">
                    {upcoming.length} {upcoming.length === 1 ? "visit" : "visits"}
                  </span>
                </div>
              </div>
              <div className="p-5">
                {upcoming.length === 0 ? (
                  <div className="py-8 text-center">
                    <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--bg-warm)]">
                      <Calendar size={24} className="text-[var(--muted)]" />
                    </div>
                    <p className="text-sm font-medium text-[var(--muted)]">No upcoming visits.</p>
                    <Link href="/patient/browse-doctors">
                      <Button size="sm" className="mt-4">
                        Book your first visit
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcoming.map((apt, i) => (
                      <motion.div
                        key={apt.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        whileHover={{ x: 4 }}
                        className="flex items-center justify-between rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--surface-raised)] p-4 transition-colors hover:border-[var(--primary)]"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary-light)] text-[var(--primary)]">
                            <User size={20} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-[var(--ink)]">{apt.doctor?.user.name}</p>
                            <p className="mt-0.5 text-sm text-[var(--muted)]">
                              {new Date(apt.slotStart).toLocaleString([], {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusBadge status={apt.status} />
                          <TextLink href={`/patient/appointments/${apt.id}`}>Open</TextLink>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </BentoCard>
          </ScrollReveal>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <ScrollReveal delay={0.1}>
            <BentoCard className="overflow-hidden">
              <div className="border-b border-[var(--line)] p-5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--muted)]">Quick actions</h3>
              </div>
              <div className="p-4 space-y-2">
                <Link href="/patient/browse-doctors" className="block">
                  <Button variant="ghost" className="w-full justify-start gap-3">
                    <Stethoscope size={18} />
                    Find a clinician
                  </Button>
                </Link>
                <Link href="/patient/my-appointments" className="block">
                  <Button variant="ghost" className="w-full justify-start gap-3">
                    <Calendar size={18} />
                    All visits
                  </Button>
                </Link>
                <Link href="/settings/calendar" className="block">
                  <Button variant="ghost" className="w-full justify-start gap-3">
                    <Clock size={18} />
                    Calendar settings
                  </Button>
                </Link>
              </div>
            </BentoCard>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <BentoCard className="overflow-hidden">
              <div className="border-b border-[var(--line)] p-5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--muted)]">Clinicians</h3>
              </div>
              <div className="p-4 space-y-3">
                {doctors.slice(0, 4).map((d) => (
                  <Link key={d.id} href={`/patient/book-appointment/${d.id}`} className="flex items-center justify-between rounded-[var(--radius-sm)] border border-[var(--line)] p-3 transition-all hover:border-[var(--primary)] hover:shadow-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary-light)] text-sm font-bold text-[var(--primary)]">
                        {d.user.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--ink)]">{d.user.name}</p>
                        <p className="text-xs text-[var(--muted)]">{d.specialization}</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-[var(--bg-warm)] px-2 py-0.5 text-xs font-semibold text-[var(--muted)]">{d.slotDuration}m</span>
                  </Link>
                ))}
                {doctors.length === 0 && (
                  <p className="py-4 text-center text-sm font-medium text-[var(--muted)]">No clinicians available.</p>
                )}
              </div>
            </BentoCard>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}
