"use client";

import { FormEvent, useEffect, useState } from "react";
import api from "@/lib/api";
import type { Doctor } from "@/lib/types";
import { Button, Card, Field, PageHeader } from "@/components/ui";

const DEFAULT_HOURS = {
  monday: ["09:00", "17:00"],
  tuesday: ["09:00", "17:00"],
  wednesday: ["09:00", "17:00"],
  thursday: ["09:00", "17:00"],
  friday: ["09:00", "16:00"],
};

export default function AdminDoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selected, setSelected] = useState<Doctor | null>(null);
  const [leaveDate, setLeaveDate] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "Password123",
    specialization: "Internal Medicine",
    slotDuration: 30,
  });

  async function load() {
    const r = (await api.adminDoctors()) as { doctors: Doctor[] };
    setDoctors(r.doctors || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function createDoctor(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api.createDoctor({ ...form, workingHours: DEFAULT_HOURS });
      setForm({ ...form, name: "", email: "" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  }

  async function addLeave(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    await api.addLeave(selected.id, new Date(leaveDate).toISOString(), leaveReason);
    setLeaveDate("");
    setLeaveReason("");
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Doctors" subtitle="Profiles, hours, and leave. Leave on a booked day flags those visits." />
      {error ? <p className="text-sm text-[var(--red)]">{error}</p> : null}

      <Card>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Specialisation</th>
              <th>Slot</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {doctors.map((d) => (
              <tr key={d.id} className={selected?.id === d.id ? "bg-[var(--paper)]" : ""}>
                <td>{d.user.name}</td>
                <td>{d.specialization}</td>
                <td>{d.slotDuration} min</td>
                <td>
                  <button type="button" className="text-sm text-[var(--teal)]" onClick={() => setSelected(d)}>
                    Select
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {selected ? (
        <Card className="p-5">
          <h2 className="mb-3 text-lg">Leave — {selected.user.name}</h2>
          <form onSubmit={addLeave} className="grid max-w-md gap-3">
            <Field label="Date">
              <input type="date" value={leaveDate} onChange={(e) => setLeaveDate(e.target.value)} required />
            </Field>
            <Field label="Reason">
              <input value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} />
            </Field>
            <Button type="submit">Mark leave</Button>
          </form>
        </Card>
      ) : null}

      <Card className="max-w-md p-5">
        <h2 className="mb-3 text-lg">Add doctor</h2>
        <form onSubmit={createDoctor} className="space-y-3">
          <Field label="Name">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label="Email">
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </Field>
          <Field label="Temporary password">
            <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </Field>
          <Field label="Specialisation">
            <input value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} required />
          </Field>
          <Field label="Slot duration (minutes)">
            <input
              type="number"
              value={form.slotDuration}
              onChange={(e) => setForm({ ...form, slotDuration: Number(e.target.value) })}
            />
          </Field>
          <Button type="submit">Create</Button>
        </form>
      </Card>
    </div>
  );
}
