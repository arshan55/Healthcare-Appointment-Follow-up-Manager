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
    <div className="flex min-h-screen items-center justify-center bg-[var(--paper)] px-6 py-10">
      <div className="animate-in w-full max-w-md rounded-[8px] border border-[var(--line)] bg-white p-6 shadow-[var(--shadow)]">
      <h1 className="text-3xl text-[var(--ink)]">Create a patient account</h1>
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
