"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import type { User } from "@/lib/types";
import { Card, PageHeader, StatusBadge } from "@/components/ui";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [role, setRole] = useState("ALL");

  useEffect(() => {
    api.adminUsers().then((r: { users: User[] }) => setUsers(r.users || []));
  }, []);

  const rows = role === "ALL" ? users : users.filter((u) => u.role === role);

  return (
    <div>
      <PageHeader title="People" />
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
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>
                  <StatusBadge status={u.role} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
