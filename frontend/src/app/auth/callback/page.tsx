"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

function dest(role: string) {
  if (role === "DOCTOR") return "/doctor/dashboard";
  if (role === "ADMIN") return "/admin/dashboard";
  return "/patient/dashboard";
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const { loginWithGoogle } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const error = params.get("error");
    if (error) {
      router.replace(`/login?error=${encodeURIComponent(error)}`);
      return;
    }
    if (!token) {
      router.replace("/login");
      return;
    }
    loginWithGoogle(token).then((user) => {
      router.replace(dest(user.role));
    }).catch(() => {
      router.replace("/login?error=google_auth_failed");
    });
  }, [router, loginWithGoogle]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--paper)]">
      <p className="text-sm font-medium text-[var(--muted)]">Signing you in…</p>
    </div>
  );
}
