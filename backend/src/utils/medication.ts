const TIMES: Record<string, number[]> = {
  once: [8],
  daily: [8],
  twice: [8, 20],
  "two times": [8, 20],
  thrice: [8, 14, 20],
  "three times": [8, 14, 20],
  qid: [8, 12, 16, 20],
  "four times": [8, 12, 16, 20],
};

export function parseReminderTimes(frequency: string, start: Date): Date[] {
  const text = frequency.toLowerCase();
  const daysMatch = text.match(/(\d+)\s*day/);
  const days = daysMatch ? Math.max(1, parseInt(daysMatch[1], 10)) : 7;

  let hours = [8, 20];
  for (const [key, value] of Object.entries(TIMES)) {
    if (text.includes(key)) {
      hours = value;
      break;
    }
  }

  const everyHours = text.match(/every\s+(\d+)\s*hour/);
  if (everyHours) {
    const step = parseInt(everyHours[1], 10);
    hours = [];
    for (let h = 8; h < 24; h += step) hours.push(h);
  }

  const reminders: Date[] = [];
  const base = new Date(start);
  base.setSeconds(0, 0);

  for (let d = 0; d < days; d++) {
    for (const hour of hours) {
      const at = new Date(base);
      at.setDate(base.getDate() + d);
      at.setHours(hour, 0, 0, 0);
      if (at.getTime() > Date.now()) {
        reminders.push(at);
      }
    }
  }
  return reminders;
}
