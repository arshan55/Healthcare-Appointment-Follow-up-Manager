"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import type { Appointment, Slot } from "@/lib/types";
import { BentoCard, Button, Field, PageHeader, SlotPill, StatusBadge } from "@/components/ui";
import { motion } from "framer-motion";
import { ease } from "@/lib/motion";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease } },
};

export default function PatientAppointmentPage() {
  const { id } = useParams<{ id: string }>();
  const [apt, setApt] = useState<Appointment | null>(null);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const { appointment } = (await api.appointment(id)) as { appointment: Appointment };
    setApt(appointment);
  }

  useEffect(() => {
    load().catch(() => setError("Could not load visit"));
  }, [id]);

  useEffect(() => {
    if (!date || !apt?.doctor?.id) return;
    api.slots(apt.doctor.id, new Date(date).toISOString()).then((r: { slots: Slot[] }) => setSlots(r.slots || []));
  }, [date, apt?.doctor?.id]);

  async function onCancel() {
    setLoading(true);
    try {
      await api.cancel(id);
      await load();
    } finally {
      setLoading(false);
    }
  }

  async function onReschedule(e: FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);
    const start = String(data.get("slot") || "");
    setLoading(true);
    try {
      await api.reschedule(id, start);
      await load();
    } finally {
      setLoading(false);
    }
  }

  if (!apt) return <p className="text-sm font-medium text-[var(--muted)]">{error || "Loading…"}</p>;

  const pre = apt.preVisit;
  const post = apt.postVisit;

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="max-w-3xl space-y-5">
      <motion.div variants={item}>
        <PageHeader title="Visit" subtitle={apt.doctor?.user.name} />
      </motion.div>

      <motion.div variants={item}>
        <BentoCard>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--muted)]">
                {new Date(apt.slotStart).toLocaleDateString([], {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <p className="mt-1 text-base font-bold text-[var(--ink)]">
                {new Date(apt.slotStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                {" — "}
                {new Date(apt.slotEnd).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            <StatusBadge status={apt.status} />
          </div>
          {["CONFIRMED", "NEEDS_RESCHEDULE", "HELD"].includes(apt.status) && (
            <div className="mt-5">
              <Button variant="danger" type="button" onClick={onCancel} disabled={loading}>
                {loading ? "Cancelling…" : "Cancel visit"}
              </Button>
            </div>
          )}
        </BentoCard>
      </motion.div>

      {pre && (
        <motion.div variants={item}>
          <BentoCard>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--ink)]">Pre-visit brief</h2>
              <StatusBadge status={pre.status} />
            </div>
            <div className="mt-4 space-y-3">
              {pre.urgency && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Urgency</span>
                  <StatusBadge status={pre.urgency} />
                </div>
              )}
              {pre.chiefComplaint && (
                <p className="text-sm leading-relaxed text-[var(--ink)]">{pre.chiefComplaint}</p>
              )}
              {Array.isArray(pre.suggestedQuestions) && pre.suggestedQuestions.length > 0 && (
                <ul className="space-y-2">
                  {pre.suggestedQuestions.map((q) => (
                    <li key={q} className="flex items-start gap-2 text-sm text-[var(--muted)]">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--teal)]" />
                      {q}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </BentoCard>
        </motion.div>
      )}

      {post && (
        <motion.div variants={item}>
          <BentoCard>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--ink)]">After the visit</h2>
              <StatusBadge status={post.status} />
            </div>
            <div className="mt-4 space-y-4">
              {post.summary && <p className="text-sm leading-relaxed text-[var(--ink)]">{post.summary}</p>}
              {post.medicationSchedule?.length ? (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Medication</p>
                  <ul className="mt-2 space-y-2">
                    {post.medicationSchedule.map((m) => (
                      <li key={m.medication} className="flex items-center justify-between rounded-[var(--radius-sm)] bg-[var(--bg)] px-3 py-2 text-sm">
                        <span className="font-semibold text-[var(--ink)]">{m.medication}</span>
                        <span className="text-[var(--muted)]">
                          {m.dosage} · {m.frequency}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {apt.prescription && (
                <p className="text-xs font-medium text-[var(--muted)]">
                  Reminder schedule: {apt.prescription.frequency}
                </p>
              )}
            </div>
          </BentoCard>
        </motion.div>
      )}

      {["NEEDS_RESCHEDULE", "CONFIRMED"].includes(apt.status) && apt.doctor && (
        <motion.div variants={item}>
          <BentoCard>
            <h2 className="mb-4 text-lg font-bold text-[var(--ink)]">Reschedule</h2>
            <form onSubmit={onReschedule} className="space-y-4">
              <Field label="New date">
                <input
                  type="date"
                  value={date}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setDate(e.target.value)}
                />
              </Field>
              {slots.length > 0 && (
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                    Available times
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {slots.map((s) => (
                      <SlotPill key={s.start}>
                        {new Date(s.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </SlotPill>
                    ))}
                  </div>
                  <select name="slot" required className="mt-3">
                    <option value="">Select a time</option>
                    {slots.map((s) => (
                      <option key={s.start} value={typeof s.start === "string" ? s.start : new Date(s.start).toISOString()}>
                        {new Date(s.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <Button type="submit" disabled={loading || !slots.length}>
                {loading ? "Rescheduling…" : "Save new time"}
              </Button>
            </form>
          </BentoCard>
        </motion.div>
      )}
    </motion.div>
  );
}
