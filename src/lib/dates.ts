/**
 * UTC-only date helpers. All ISO date strings ("YYYY-MM-DD") are interpreted
 * as calendar dates with no timezone semantics. Avoid mixing local-time Date
 * methods with these helpers.
 */

const DAY_NAMES_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const MONTH_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatISODate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** 0 = Sunday ... 6 = Saturday */
export function dayOfWeekUTC(iso: string): number {
  return parseISODate(iso).getUTCDay();
}

export function dayNameLong(iso: string): string {
  return DAY_NAMES_LONG[dayOfWeekUTC(iso)];
}

export function dayNameShort(iso: string): string {
  return DAY_NAMES_SHORT[dayOfWeekUTC(iso)];
}

export function monthYear(iso: string): { year: number; month: number } {
  const d = parseISODate(iso);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
}

export interface FormattedDate {
  dayAbbr: string;
  monthDay: string;
  fullLong: string;
  shortLong: string;
}

export function formatDateDisplay(iso: string): FormattedDate {
  const d = parseISODate(iso);
  const dayIdx = d.getUTCDay();
  const monthIdx = d.getUTCMonth();
  const dayNum = d.getUTCDate();
  return {
    dayAbbr: DAY_NAMES_SHORT[dayIdx],
    monthDay: `${MONTH_SHORT[monthIdx]} ${dayNum}`,
    fullLong: `${DAY_NAMES_LONG[dayIdx]}, ${MONTH_LONG[monthIdx]} ${dayNum}`,
    shortLong: `${DAY_NAMES_SHORT[dayIdx]}, ${MONTH_SHORT[monthIdx]} ${dayNum}`,
  };
}

export function todayISO(): string {
  // Use UTC today; if you need the user's local "today", do it explicitly.
  const now = new Date();
  return formatISODate(
    new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
  );
}
