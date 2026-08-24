"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Button, Field } from "@/components/ui";

function dest(role: string) {
  if (role === "DOCTOR") return "/doctor/dashboard";
  if (role === "ADMIN") return "/admin/dashboard";
  return "/patient/dashboard";
}

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(email, password);
      router.push(dest(user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--paper)] px-6 py-10">
      <div className="animate-in w-full max-w-md rounded-[8px] border border-[var(--line)] bg-white p-6 shadow-[var(--shadow)]">
      <h1 className="text-3xl text-[var(--ink)]">Sign in</h1>
      <p className="mt-2 text-sm font-medium text-[var(--muted)]">Use any email for demo mode. Try `admin@demo.local` or `doctor@demo.local`.</p>
      {error ? <p className="mt-4 rounded-[8px] bg-red-50 p-3 text-sm font-medium text-[var(--red)]">{error}</p> : null}
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <Field label="Email">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Password">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        <Button type="submit" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="mt-6 text-sm text-[var(--muted)]">
        New patient? <Link href="/register" className="text-[var(--teal)]">Create an account</Link>
      </p>
      </div>
    </div>
  );
}
