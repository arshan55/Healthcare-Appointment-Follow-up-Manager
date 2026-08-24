"use client";

import { motion, HTMLMotionProps } from "framer-motion";
import Link from "next/link";
import type { ReactNode } from "react";

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
}) {
  const base =
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-sm)] px-5 py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100";
  const styles =
    variant === "primary"
      ? "bg-[var(--teal)] text-white shadow-sm hover:bg-[var(--teal-hover)] hover:shadow-md"
      : variant === "danger"
        ? "bg-white text-[var(--terracotta)] border border-[var(--line)] hover:border-[var(--terracotta)] hover:shadow-sm"
        : "bg-white text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--teal-glow)] hover:border-[var(--teal)] hover:text-[var(--teal)]";
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      {...(props as HTMLMotionProps<"button">)}
      className={`${base} ${styles} ${className}`}
    >
      {children}
    </motion.button>
  );
}

export function Card({
  children,
  className = "",
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <motion.div
      whileHover={hover ? { y: -2, boxShadow: "var(--shadow-float)" } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-card)] transition-all duration-200 ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; label: string; text?: string }> = {
    CONFIRMED: { bg: "#E6F2F2", label: "Confirmed", text: "var(--teal)" },
    COMPLETED: { bg: "#E6F2F2", label: "Completed", text: "var(--teal)" },
    HELD: { bg: "#FFF3E6", label: "On hold", text: "var(--terracotta)" },
    CANCELLED: { bg: "#FDECEA", label: "Cancelled", text: "#C0392B" },
    CANCELLED_DUE_TO_LEAVE: { bg: "#FDECEA", label: "Cancelled — leave", text: "#C0392B" },
    NEEDS_RESCHEDULE: { bg: "#FFF3E6", label: "Needs reschedule", text: "var(--terracotta)" },
    PENDING: { bg: "#F0F4F3", label: "Pending", text: "var(--muted)" },
    READY: { bg: "#E6F2F2", label: "Ready", text: "var(--teal)" },
    FAILED: { bg: "#FDECEA", label: "Failed", text: "#C0392B" },
    Low: { bg: "#E6F2F2", label: "Low", text: "var(--teal)" },
    Medium: { bg: "#FFF3E6", label: "Medium", text: "#E65100" },
    High: { bg: "#FDECEA", label: "High", text: "#C0392B" },
  };
  const item = map[status] || { bg: "#F0F4F3", label: status, text: "var(--muted)" };
  return (
    <motion.span
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className="inline-flex items-center rounded-[999px] px-3 py-1 text-xs font-bold"
      style={{ background: item.bg, color: item.text || "var(--ink)" }}
    >
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
      {error ? <p className="mt-2 text-xs font-medium text-[#C0392B]">{error}</p> : null}
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
    <Link href={href} className="text-sm font-semibold text-[var(--teal)] hover:underline underline-offset-4">
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
      onClick={onClick}
      className={`relative rounded-[var(--radius-sm)] px-4 py-3 text-sm font-semibold transition-all duration-200 border ${
        active
          ? "border-[var(--teal)] bg-[var(--teal)] text-white shadow-md"
          : "border-[var(--line)] bg-white text-[var(--ink)] hover:border-[var(--teal)] hover:text-[var(--teal)]"
      }`}
    >
      {active && (
        <motion.div
          layoutId="slot-active-ring"
          className="absolute inset-0 rounded-[var(--radius-sm)] border-2 border-[var(--teal)]"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
      {children}
    </motion.button>
  );
}

export function BreathingShape({ className = "" }: { className?: string }) {
  return (
    <motion.div
      animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.75, 0.5] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      className={`absolute rounded-full bg-gradient-to-br from-[var(--teal-glow)] to-[#CCEBE8] blur-2xl ${className}`}
    />
  );
}
