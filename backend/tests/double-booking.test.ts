/**
 * Double-booking prevention: same algorithm as AppointmentService
 * (FOR UPDATE serialization + occupancyKey uniqueness).
 */

function occupancyKey(doctorId: string, slot: string) {
  return `${doctorId}:${slot}`;
}

class SlotStore {
  occupied = new Set<string>();
  holds = new Map<string, { patientId: string; expiresAt: number }>();
  appointments: { id: string; status: string; patientId: string }[] = [];
  lock = Promise.resolve();

  withLock<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.lock.then(fn, fn);
    this.lock = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  async hold(doctorId: string, slot: string, patientId: string) {
    return this.withLock(async () => {
      const key = occupancyKey(doctorId, slot);
      if (this.occupied.has(key)) throw new Error("SLOT_TAKEN");
      const existing = this.holds.get(key);
      if (existing && existing.expiresAt > Date.now()) throw new Error("SLOT_TAKEN");
      this.holds.set(key, { patientId, expiresAt: Date.now() + 10_000 });
      return key;
    });
  }

  async confirm(doctorId: string, slot: string, patientId: string) {
    return this.withLock(async () => {
      const key = occupancyKey(doctorId, slot);
      const hold = this.holds.get(key);
      if (!hold || hold.patientId !== patientId || hold.expiresAt <= Date.now()) {
        throw new Error("HOLD_EXPIRED");
      }
      if (this.occupied.has(key)) throw new Error("SLOT_TAKEN");
      this.occupied.add(key);
      this.holds.delete(key);
      const apt = { id: key, status: "CONFIRMED", patientId };
      this.appointments.push(apt);
      return apt;
    });
  }
}

describe("double-booking prevention", () => {
  it("allows only one confirm when two patients race the same slot", async () => {
    const store = new SlotStore();
    const slot = "2026-01-05T09:00:00.000Z";
    await Promise.all([store.hold("d1", slot, "p1"), store.hold("d1", slot, "p2")].map((p) => p.catch((e) => e)));

    const results = await Promise.allSettled([store.confirm("d1", slot, "p1"), store.confirm("d1", slot, "p2")]);
    const ok = results.filter((r) => r.status === "fulfilled");
    expect(ok).toHaveLength(1);
    expect(store.appointments).toHaveLength(1);
  });
});
