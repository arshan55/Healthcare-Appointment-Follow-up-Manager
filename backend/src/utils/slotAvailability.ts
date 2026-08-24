export type WorkingHours = Record<string, [string, string]>;

export interface OccupiedSlot {
  slotStart: Date;
  status?: string;
}

export interface ComputedSlot {
  start: Date;
  end: Date;
}

export function computeAvailableSlots(params: {
  date: Date;
  workingHours: WorkingHours;
  slotDuration: number;
  onLeave: boolean;
  occupied: OccupiedSlot[];
  activeHolds: { slotStart: Date; expiresAt: Date }[];
  now?: Date;
}): ComputedSlot[] {
  const now = params.now ?? new Date();
  if (params.onLeave) return [];

  const dayName = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][
    params.date.getDay()
  ];
  const hours = params.workingHours[dayName];
  if (!hours) return [];

  const [startHour, endHour] = hours;
  const occupiedTimes = new Set(
    params.occupied
      .filter((o) => !["CANCELLED", "CANCELLED_DUE_TO_LEAVE"].includes(o.status || ""))
      .map((o) => o.slotStart.getTime())
  );

  for (const hold of params.activeHolds) {
    if (hold.expiresAt > now) {
      occupiedTimes.add(hold.slotStart.getTime());
    }
  }

  const [startH, startM] = startHour.split(":").map(Number);
  const [endH, endM] = endHour.split(":").map(Number);

  const startTime = new Date(params.date);
  startTime.setHours(startH, startM, 0, 0);
  const endTime = new Date(params.date);
  endTime.setHours(endH, endM, 0, 0);

  const slots: ComputedSlot[] = [];
  for (let t = startTime.getTime(); t + params.slotDuration * 60_000 <= endTime.getTime(); t += params.slotDuration * 60_000) {
    if (occupiedTimes.has(t)) continue;
    if (t <= now.getTime()) continue;
    slots.push({
      start: new Date(t),
      end: new Date(t + params.slotDuration * 60_000),
    });
  }
  return slots;
}
