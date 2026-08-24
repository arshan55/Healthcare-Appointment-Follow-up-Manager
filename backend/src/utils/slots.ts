export type WorkingHours = Record<string, [string, string]>;

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function endOfDay(date: Date): Date {
  const d = startOfDay(date);
  d.setDate(d.getDate() + 1);
  return d;
}

export function occupancyKey(doctorId: string, slotStart: Date): string {
  return `${doctorId}:${slotStart.toISOString()}`;
}

export function computeAvailableSlots(params: {
  date: Date;
  workingHours: WorkingHours;
  slotDuration: number;
  occupiedStarts: Date[];
}): { start: Date; end: Date }[] {
  const { date, workingHours, slotDuration, occupiedStarts } = params;
  const dayName = DAY_NAMES[date.getDay()];
  const hours = workingHours[dayName];
  if (!hours) return [];

  const occupied = new Set(occupiedStarts.map((d) => d.getTime()));
  const [startHour, endHour] = hours;
  const [startH, startM] = startHour.split(":").map(Number);
  const [endH, endM] = endHour.split(":").map(Number);

  const startTime = startOfDay(date);
  startTime.setHours(startH, startM, 0, 0);
  const endTime = startOfDay(date);
  endTime.setHours(endH, endM, 0, 0);

  const slots: { start: Date; end: Date }[] = [];
  for (let t = startTime.getTime(); t + slotDuration * 60000 <= endTime.getTime(); t += slotDuration * 60000) {
    if (!occupied.has(t)) {
      slots.push({ start: new Date(t), end: new Date(t + slotDuration * 60000) });
    }
  }
  return slots;
}
