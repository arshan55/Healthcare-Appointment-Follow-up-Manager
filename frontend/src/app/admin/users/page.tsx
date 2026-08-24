"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import type { User } from "@/lib/types";
import { Button, Card, PageHeader, StatusBadge } from "@/components/ui";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [role, setRole] = useState("ALL");
  const [changing, setChanging] = useState<string | null>(null);

  useEffect(() => {
    api.adminUsers().then((r: { users: User[] }) => setUsers(r.users || []));
  }, []);

  const rows = role === "ALL" ? users : users.filter((u) => u.role === role);

  async function changeRole(userId: string, newRole: string) {
    setChanging(userId);
    try {
      const { user } = (await api.updateUserRole(userId, newRole)) as { user: User };
      setUsers((prev) => prev.map((u) => (u.id === userId ? user : u)));
    } catch {
      // handled silently
    } finally {
      setChanging(null);
    }
  }

  return (
    <div>
      <PageHeader title="People" subtitle="Manage roles. Google-authenticated users default to Patient." />
      <div className="mb-4 flex gap-2">
        {["ALL", "PATIENT", "DOCTOR", "ADMIN"].map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={`rounded-[8px] border px-3 py-1 text-sm ${role === r ? "border-[var(--ink)]" : "border-[var(--line)]"}`}
          >
            {r}
          </button>
        ))}
      </div>
      <Card>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td className="text-sm text-[var(--muted)]">{u.email}</td>
                <td>
                  <StatusBadge status={u.role} />
                </td>
                <td>
                  <div className="flex gap-2">
                    {["PATIENT", "DOCTOR", "ADMIN"].map((r) => (
                      <button
                        key={r}
                        type="button"
                        disabled={changing === u.id || u.role === r}
                        onClick={() => changeRole(u.id, r)}
                        className={`rounded-[8px] border px-2 py-1 text-xs font-semibold transition disabled:opacity-50 ${
                          u.role === r ? "border-[var(--teal)] bg-[var(--teal)] text-white" : "border-[var(--line)] hover:border-[var(--teal)]"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
