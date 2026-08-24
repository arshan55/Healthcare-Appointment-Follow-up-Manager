"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { Button, Card, PageHeader } from "@/components/ui";
import { Suspense } from "react";

function CalendarInner() {
  const { user, refresh } = useAuth();
  const params = useSearchParams();
  const [error, setError] = useState("");
  const connected = Boolean(user?.calendarConnected) || params.get("connected") === "1";

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function connect() {
    setError("");
    try {
      const { url } = (await api.calendarConnect()) as { url: string };
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Calendar is not configured on the server");
    }
  }

  return (
    <div className="max-w-lg">
      <PageHeader title="Google Calendar" subtitle="Optional. Booking still works if you skip this." />
      <Card className="p-5">
        <p className="text-sm text-[var(--muted)]">
          {connected
            ? "This account is connected. New visits will be written to Google Calendar when possible."
            : "Connect your calendar so confirmed visits appear as events. Failures are logged and never block booking."}
        </p>
        {error ? <p className="mt-3 text-sm text-[var(--red)]">{error}</p> : null}
        <div className="mt-4">
          <Button type="button" onClick={connect}>
            Connect Google Calendar
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default function CalendarSettingsPage() {
  return (
    <Suspense fallback={<p className="p-8 text-sm">Loading…</p>}>
      <CalendarInner />
    </Suspense>
  );
}
