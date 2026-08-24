"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, PageHeader } from "@/components/ui";

export default function AdminDashboard() {
  const [stats, setStats] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    api.adminStats().then((r: { statistics: Record<string, number> }) => setStats(r.statistics));
  }, []);

  if (!stats) return <p className="text-sm text-[var(--muted)]">Loading…</p>;

  const rows = [
    ["People", stats.totalUsers],
    ["Doctors", stats.totalDoctors],
    ["Patients", stats.totalPatients],
    ["Appointments", stats.totalAppointments],
    ["Completed", stats.completedAppointments],
    ["Cancelled", stats.cancelledAppointments],
  ];

  return (
    <div>
      <PageHeader title="Overview" subtitle="Counts only — open the tables for work." />
      <Card>
        <table>
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k}>
                <td className="text-[var(--muted)]">{k}</td>
                <td className="text-right font-medium">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
