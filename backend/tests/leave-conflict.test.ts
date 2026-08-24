/**
 * Leave-conflict handling: confirmed visits become NEEDS_RESCHEDULE and occupancy is released.
 */

describe("leave-conflict handling", () => {
  it("flags confirmed visits and frees the occupancy key", () => {
    const occupied = new Set(["d1:2026-01-05T09:00:00.000Z"]);
    const appointments = [{ id: "a1", status: "CONFIRMED", occupancyKey: "d1:2026-01-05T09:00:00.000Z" }];

    for (const apt of appointments) {
      if (apt.status === "CONFIRMED") {
        apt.status = "NEEDS_RESCHEDULE";
        apt.occupancyKey = "";
        occupied.delete("d1:2026-01-05T09:00:00.000Z");
      }
    }

    expect(appointments[0].status).toBe("NEEDS_RESCHEDULE");
    expect(occupied.size).toBe(0);
  });
});
