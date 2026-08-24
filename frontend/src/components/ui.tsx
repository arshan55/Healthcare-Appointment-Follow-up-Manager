"use client";

import { motion, HTMLMotionProps } from "framer-motion";
import Link from "next/link";
import type { ReactNode } from "react";

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] font-semibold transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100";
  
  const sizes = {
    sm: "px-4 py-2 text-xs min-h-9",
    md: "px-5 py-3 text-sm min-h-11",
    lg: "px-6 py-3.5 text-base min-h-12",
  };

  const styles =
    variant === "primary"
      ? "bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/20 hover:bg-[var(--primary-hover)] hover:shadow-lg hover:shadow-[var(--primary)]/30"
      : variant === "danger"
        ? "bg-[var(--accent)] text-white shadow-md shadow-[var(--accent)]/20 hover:bg-[var(--accent-hover)] hover:shadow-lg"
        : variant === "outline"
          ? "bg-transparent text-[var(--ink)] border-2 border-[var(--line)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
          : "bg-white text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--bg-warm)] hover:border-[var(--line-strong)]";

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      whileHover={{ scale: 1.01 }}
      {...(props as HTMLMotionProps<"button">)}
      className={`${base} ${sizes[size]} ${styles} ${className}`}
    >
      {children}
    </motion.button>
  );
}

export function Card({
  children,
  className = "",
  hover = false,
  padding = true,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  padding?: boolean;
}) {
  return (
    <motion.div
      whileHover={hover ? { y: -4, boxShadow: "var(--shadow-lg)" } : undefined}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={`rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-sm)] transition-colors duration-200 ${
        hover ? "hover:border-[var(--line-strong)]" : ""
      } ${padding ? "p-5" : ""} ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; dot: string; label: string; text?: string }> = {
    CONFIRMED: { bg: "var(--primary-light)", dot: "var(--primary)", label: "Confirmed", text: "var(--primary)" },
    COMPLETED: { bg: "var(--success-light)", dot: "var(--success)", label: "Completed", text: "var(--success)" },
    HELD: { bg: "var(--warning-light)", dot: "var(--warning)", label: "On hold", text: "var(--warning)" },
    CANCELLED: { bg: "var(--accent-light)", dot: "var(--accent)", label: "Cancelled", text: "var(--accent)" },
    CANCELLED_DUE_TO_LEAVE: { bg: "var(--accent-light)", dot: "var(--accent)", label: "Cancelled", text: "var(--accent)" },
    NEEDS_RESCHEDULE: { bg: "var(--warning-light)", dot: "var(--warning)", label: "Reschedule", text: "var(--warning)" },
    PENDING: { bg: "var(--bg-warm)", dot: "var(--muted)", label: "Pending", text: "var(--muted)" },
    READY: { bg: "var(--success-light)", dot: "var(--success)", label: "Ready", text: "var(--success)" },
    FAILED: { bg: "var(--accent-light)", dot: "var(--accent)", label: "Failed", text: "var(--accent)" },
    Low: { bg: "var(--success-light)", dot: "var(--success)", label: "Low", text: "var(--success)" },
    Medium: { bg: "var(--warning-light)", dot: "var(--warning)", label: "Medium", text: "var(--warning)" },
    High: { bg: "var(--accent-light)", dot: "var(--accent)", label: "High", text: "var(--accent)" },
  };
  const item = map[status] || { bg: "var(--bg-warm)", dot: "var(--muted)", label: status, text: "var(--muted)" };
  return (
    <motion.span
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
      style={{ background: item.bg, color: item.text || "var(--ink)" }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: item.dot }} />
      {item.label}
    </motion.span>
  );
}

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label>{label}</label>
      {children}
      {error ? <p className="mt-2 text-xs font-medium text-[var(--accent)]">{error}</p> : null}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div>
        <h1 className="text-3xl md:text-4xl text-[var(--ink)]">{title}</h1>
        {subtitle ? <p className="mt-2 max-w-2xl text-sm font-medium text-[var(--muted)]">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-sm font-semibold text-[var(--primary)] hover:underline underline-offset-4 transition-colors">
      {children}
    </Link>
  );
}

export function BentoGrid({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${className}`}>
      {children}
    </div>
  );
}

export function BentoCard({
  children,
  className = "",
  span = 1,
  hover = true,
}: {
  children: ReactNode;
  className?: string;
  span?: number;
  hover?: boolean;
}) {
  const spanClass =
    span === 2 ? "md:col-span-2" : span === 3 ? "md:col-span-2 lg:col-span-3" : span === 4 ? "lg:col-span-4" : "";
  return (
    <Card hover={hover} className={`p-5 md:p-6 ${spanClass} ${className}`}>
      {children}
    </Card>
  );
}

export function SlotPill({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      whileHover={{ scale: 1.03 }}
      onClick={onClick}
      className={`relative rounded-[var(--radius-sm)] px-4 py-3 text-sm font-semibold transition-all duration-200 border ${
        active
          ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/30"
          : "border-[var(--line)] bg-white text-[var(--ink)] hover:border-[var(--primary)] hover:text-[var(--primary)] hover:shadow-md"
      }`}
    >
      {children}
    </motion.button>
  );
}

export function BreathingShape({ className = "" }: { className?: string }) {
  return (
    <motion.div
      animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.75, 0.5] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      className={`absolute rounded-full bg-gradient-to-br from-[var(--primary-light)] to-[#CCEBE8] blur-2xl ${className}`}
    />
  );
}
