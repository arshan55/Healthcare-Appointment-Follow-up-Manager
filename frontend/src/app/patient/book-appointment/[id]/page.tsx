"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import type { Doctor, Slot } from "@/lib/types";
import { Button, Card, Field, PageHeader, SlotPill } from "@/components/ui";
import { motion } from "framer-motion";
import { ease } from "@/lib/motion";

export default function BookPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [holdId, setHoldId] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.doctor(id).then((r: { doctor: Doctor }) => setDoctor(r.doctor));
  }, [id]);

  useEffect(() => {
    if (!date) return;
    api
      .slots(id, new Date(date).toISOString())
      .then((r: { slots: { start: string; end: string }[] }) => {
        setSlots(
          (r.slots || []).map((s) => ({
            start: typeof s.start === "string" ? s.start : new Date(s.start).toISOString(),
            end: typeof s.end === "string" ? s.end : new Date(s.end).toISOString(),
          }))
        );
      });
  }, [date, id]);

  async function holdSlot(s: Slot) {
    setError("");
    setLoading(true);
    try {
      const { hold } = (await api.hold(id, s.start)) as { hold: { id: string; expiresAt: string } };
      setSelectedSlot(s);
      setHoldId(hold.id);
      setExpiresAt(hold.expiresAt);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not hold this time");
    } finally {
      setLoading(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.book({ holdId, symptoms });
      router.push("/patient/my-appointments");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="Book a visit" subtitle={doctor ? doctor.user.name : "Loading…"} />
      {error ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-[var(--radius-sm)] border border-[#F5C6CB] bg-[#FDECEA] p-4 text-sm font-medium text-[#C0392B]"
        >
          {error}
        </motion.div>
      ) : null}

      {step === 1 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}>
          <Card className="p-6">
            <Field label="Select a date">
              <input
                type="date"
                value={date}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
            <div className="mt-5">
              <Button type="button" disabled={!date} onClick={() => setStep(2)}>
                Show available times
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      {step === 2 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}>
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-[var(--muted)]">
                {date
                  ? new Date(date).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })
                  : "Available times"}
              </p>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-sm font-semibold text-[var(--muted)] hover:text-[var(--ink)]"
              >
                Change date
              </button>
            </div>

            {slots.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {slots.map((s) => (
                  <SlotPill key={s.start} onClick={() => holdSlot(s)}>
                    {new Date(s.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </SlotPill>
                ))}
              </div>
            ) : (
              <p className="text-sm font-medium text-[var(--muted)]">No times available on this date.</p>
            )}
          </Card>
        </motion.div>
      )}

      {step === 3 && selectedSlot && (
        <motion.form
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease }}
          onSubmit={submit}
        >
          <Card className="p-6">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <div className="rounded-[var(--radius-sm)] bg-[var(--teal-glow)] px-3 py-1.5 text-xs font-bold text-[var(--teal)]">
                HOLD
              </div>
              <p className="text-sm text-[var(--muted)]">
                {new Date(selectedSlot.start).toLocaleString([], {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {" — "}
                expires {expiresAt ? new Date(expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "soon"}
              </p>
            </div>

            <Field label="Symptoms and context (required before confirmation)">
              <textarea
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                minLength={10}
                rows={6}
                placeholder="Describe your symptoms, duration, severity, and any relevant history..."
                required
              />
            </Field>
            <div className="mt-5 flex items-center gap-3">
              <Button type="submit" disabled={loading || symptoms.length < 10}>
                {loading ? "Confirming…" : "Confirm visit"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setStep(2)}>
                Back
              </Button>
            </div>
          </Card>
        </motion.form>
      )}
    </div>
  );
}
