import type { Session } from "./types";
import { addDays, formatISODate, parseISODate } from "./dates";
import { parseTimeToMinutes } from "./time";

export type WeekRow = { date: string; sessions: Session[] }[];

// Builds a month-grid of weeks (Sun-Sat rows) spanning the session date range.
// A single calendar day can hold multiple sessions (e.g. a morning and an
// evening training), so each day cell carries an array sorted by start time.
export function buildCalendarWeeks(sessions: Session[]): WeekRow[] {
  if (sessions.length === 0) return [];

  const byDate = new Map<string, Session[]>();
  for (const s of sessions) {
    const existing = byDate.get(s.date);
    if (existing) existing.push(s);
    else byDate.set(s.date, [s]);
  }
  for (const daySessions of byDate.values()) {
    daySessions.sort(
      (a, b) =>
        parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime) ||
        a.startTime.localeCompare(b.startTime)
    );
  }

  const sorted = sessions.map((s) => s.date).sort();
  const first = parseISODate(sorted[0]);
  const last = parseISODate(sorted[sorted.length - 1]);

  const start = addDays(first, -first.getUTCDay());
  const end = addDays(last, 6 - last.getUTCDay());

  const weeks: WeekRow[] = [];
  let cur = start;
  while (cur.getTime() <= end.getTime()) {
    const week: WeekRow = [];
    for (let d = 0; d < 7; d++) {
      const ds = formatISODate(cur);
      week.push({ date: ds, sessions: byDate.get(ds) ?? [] });
      cur = addDays(cur, 1);
    }
    weeks.push(week);
  }
  return weeks;
}
