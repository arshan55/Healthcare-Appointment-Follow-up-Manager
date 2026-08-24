"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import type { Doctor } from "@/lib/types";
import { BentoCard, BentoGrid, Button, Card, PageHeader } from "@/components/ui";
import { ease } from "@/lib/motion";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease } },
};

export default function BrowseDoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    api.doctors().then((r: { doctors: Doctor[] }) => setDoctors(r.doctors || []));
  }, []);

  const filtered = useMemo(
    () =>
      doctors.filter(
        (d) =>
          d.specialization.toLowerCase().includes(q.toLowerCase()) ||
          d.user.name.toLowerCase().includes(q.toLowerCase())
      ),
    [doctors, q]
  );

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      <PageHeader title="Find a clinician" subtitle="Filter by specialisation, then pick a time." />
      <motion.div variants={item} className="mb-6 max-w-md">
        <input
          className="rounded-[var(--radius-sm)]"
          placeholder="e.g. Internal Medicine"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </motion.div>

      <BentoGrid>
        {filtered.map((d) => (
          <motion.div key={d.id} variants={item}>
            <BentoCard hover>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-bold text-[var(--ink)]">{d.user.name}</p>
                  <p className="mt-1 text-sm font-medium text-[var(--muted)]">
                    {d.specialization}
                  </p>
                </div>
                <span className="rounded-full bg-[var(--teal-glow)] px-3 py-1 text-xs font-bold text-[var(--teal)]">
                  {d.slotDuration}m
                </span>
              </div>
              <div className="mt-5 flex items-center justify-between">
                <p className="text-xs font-semibold text-[var(--muted)]">Next available</p>
                <Link href={`/patient/book-appointment/${d.id}`}>
                  <Button className="h-9 px-4 py-2 text-xs">Choose a time</Button>
                </Link>
              </div>
            </BentoCard>
          </motion.div>
        ))}
        {filtered.length === 0 && (
          <motion.div variants={item}>
            <Card className="p-8 text-center">
              <p className="text-sm font-medium text-[var(--muted)]">No matching clinicians.</p>
            </Card>
          </motion.div>
        )}
      </BentoGrid>
    </motion.div>
  );
}

