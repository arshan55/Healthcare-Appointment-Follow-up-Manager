"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Button, Field } from "@/components/ui";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(email, password, name);
      router.push("/patient/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-6 py-10">
      <div className="animate-fade-up w-full max-w-md rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-8 shadow-[var(--shadow-md)]">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)] transition-colors hover:text-[var(--primary)]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="m12 19-7-7 7-7" />
          </svg>
          Back to portals
        </Link>
        <h1 className="mt-6 text-3xl text-[var(--ink)]">Create a patient account</h1>
        <p className="mt-2 text-sm font-medium text-[var(--muted)]">Doctor and admin accounts are created by clinic staff.</p>
      {error ? <p className="mt-4 rounded-[8px] bg-red-50 p-3 text-sm font-medium text-[var(--red)]">{error}</p> : null}
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <Field label="Full name">
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Email">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Password (8+ characters)">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
        </Field>
        <Button type="submit" disabled={loading}>
          {loading ? "Creating…" : "Create account"}
        </Button>
      </form>
      <p className="mt-6 text-sm text-[var(--muted)]">
        Already registered? <Link href="/login" className="text-[var(--teal)]">Sign in</Link>
      </p>
      </div>
    </div>
  );
}
