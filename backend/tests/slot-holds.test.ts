/**
 * Slot holds: an unexpired hold occupies the time; an expired hold does not.
 */

import { computeAvailableSlots } from "../src/utils/slotAvailability";

describe("slot holds", () => {
  const monday = new Date(2026, 7, 24); // Monday
  const hours = { monday: ["09:00", "11:00"] as [string, string] };
  const now = new Date(2026, 7, 23, 12, 0, 0);

  it("hides a slot while a hold is unexpired", () => {
    const holdStart = new Date(2026, 7, 24, 9, 0, 0);
    const slots = computeAvailableSlots({
      date: monday,
      workingHours: hours,
      slotDuration: 30,
      onLeave: false,
      occupied: [],
      activeHolds: [{ slotStart: holdStart, expiresAt: new Date(2026, 7, 25) }],
      now,
    });
    expect(slots.map((s) => s.start.getTime())).not.toContain(holdStart.getTime());
  });

  it("returns the slot after the hold expires", () => {
    const holdStart = new Date(2026, 7, 24, 9, 0, 0);
    const slots = computeAvailableSlots({
      date: monday,
      workingHours: hours,
      slotDuration: 30,
      onLeave: false,
      occupied: [],
      activeHolds: [{ slotStart: holdStart, expiresAt: new Date(2026, 7, 22) }],
      now,
    });
    expect(slots[0].start.getTime()).toBe(holdStart.getTime());
  });
});
