"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import type { Appointment } from "@/lib/types";
import { BentoCard, Button, Field, PageHeader, StatusBadge } from "@/components/ui";
import { motion } from "framer-motion";
import { ease } from "@/lib/motion";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease } },
};

export default function DoctorVisitPage() {
  const { id } = useParams<{ id: string }>();
  const [apt, setApt] = useState<Appointment | null>(null);
  const [notes, setNotes] = useState("");
  const [medication, setMedication] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("twice daily for 5 days");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function load() {
    const { appointment } = (await api.appointment(id)) as { appointment: Appointment };
    setApt(appointment);
    if (appointment.postVisitNote?.notes) setNotes(appointment.postVisitNote.notes);
  }

  useEffect(() => {
    load().catch(() => setError("Could not load visit"));
  }, [id]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);
    try {
      await api.notes(id, { notes, medication, dosage, frequency });
      setSaved(true);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  if (!apt) return <p className="text-sm font-medium text-[var(--muted)]">{error || "Loading…"}</p>;
  const pre = apt.preVisit;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5">
        <motion.div variants={item}>
          <PageHeader
            title={apt.patient?.name || "Patient"}
            subtitle={new Date(apt.slotStart).toLocaleString([], {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          />
        </motion.div>

        <motion.div variants={item}>
          <BentoCard>
            <h2 className="mb-3 text-lg font-bold text-[var(--ink)]">Symptoms</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--muted)]">
              {apt.symptomForm?.symptoms || "No symptoms recorded."}
            </p>
          </BentoCard>
        </motion.div>

        <motion.form variants={item} onSubmit={submit}>
          <BentoCard>
            <h2 className="mb-4 text-lg font-bold text-[var(--ink)]">Post-visit notes</h2>
            {error && (
              <div className="mb-4 rounded-[var(--radius-sm)] border border-[#F5C6CB] bg-[#FDECEA] p-3 text-sm font-medium text-[#C0392B]">
                {error}
              </div>
            )}
            {saved && (
              <div className="mb-4 rounded-[var(--radius-sm)] border border-[#D4EDDA] bg-[#E6F2F2] p-3 text-sm font-medium text-[var(--teal)]">
                Notes saved. Generating patient summary…
              </div>
            )}
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={8}
              className="mb-4"
              placeholder="Clinical notes, diagnosis, treatment plan…"
              required
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Medication">
                <input value={medication} onChange={(e) => setMedication(e.target.value)} placeholder="e.g. Amoxicillin" />
              </Field>
              <Field label="Dosage">
                <input value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="e.g. 500mg" />
              </Field>
              <Field label="Frequency">
                <input value={frequency} onChange={(e) => setFrequency(e.target.value)} />
              </Field>
            </div>
            <div className="mt-5">
              <Button type="submit">Save notes and generate patient summary</Button>
            </div>
          </BentoCard>
        </motion.form>
      </motion.div>

      <motion.aside
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease }}
      >
        <BentoCard>
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Pre-visit</p>
            {pre?.urgency && <StatusBadge status={pre.urgency} />}
          </div>
          <div className="mt-4">
            <p className="text-sm font-semibold text-[var(--ink)]">{pre?.chiefComplaint || "No brief yet."}</p>
            {Array.isArray(pre?.suggestedQuestions) && pre.suggestedQuestions.length > 0 && (
              <ul className="mt-3 space-y-2">
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
      </motion.aside>
    </div>
  );
}
