"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import type { Appointment } from "@/lib/types";
import { Card, PageHeader, StatusBadge } from "@/components/ui";

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    api.adminAppointments().then((r: { appointments: Appointment[] }) => setAppointments(r.appointments || []));
  }, []);

  const rows = filter === "ALL" ? appointments : appointments.filter((a) => a.status === filter);

  return (
    <div>
      <PageHeader title="Appointments" />
      <div className="mb-4 flex flex-wrap gap-2">
        {["ALL", "CONFIRMED", "NEEDS_RESCHEDULE", "COMPLETED", "CANCELLED"].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`rounded-[8px] border px-3 py-1 text-sm ${filter === s ? "border-[var(--ink)]" : "border-[var(--line)]"}`}
          >
            {s}
          </button>
        ))}
      </div>
      <Card>
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Patient</th>
              <th>Doctor</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((apt) => (
              <tr key={apt.id}>
                <td>{new Date(apt.slotStart).toLocaleString()}</td>
                <td>{apt.patient?.name}</td>
                <td>{apt.doctor?.user.name}</td>
                <td>
                  <StatusBadge status={apt.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
