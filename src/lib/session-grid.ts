import type { Session } from "./types";

export function sessionGridKey(date: string, startTime: string, endTime: string): string {
  return `${date}|${startTime}–${endTime}`;
}

// Groups sessions into grid cells keyed by date + time window. Multiple
// sessions can share the same date and time window (e.g. two concurrent
// sessions at different locations), so each cell holds an array.
export function buildSessionGrid(sessions: Session[]): Map<string, Session[]> {
  const map = new Map<string, Session[]>();
  for (const s of sessions) {
    const key = sessionGridKey(s.date, s.startTime, s.endTime);
    const existing = map.get(key);
    if (existing) existing.push(s);
    else map.set(key, [s]);
  }
  return map;
}
