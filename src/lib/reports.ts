import type {
  ReportBucket,
  ReportPayload,
  ReportPeriodType,
  ReportScope,
  ReportRow,
  Schedule,
  Session,
  SessionSlot,
  Staff,
} from "./types";
import {
  parseTimeToMinutes as sharedParseTimeToMinutes,
  hoursBetween as sharedHoursBetween,
} from "./time";

const MONTH_LABELS = [
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

export const parseTimeToMinutes = sharedParseTimeToMinutes;
export const hoursBetween = sharedHoursBetween;

function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatISODate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function startOfWeek(date: Date): Date {
  const day = date.getUTCDay();
  const adjusted = (day + 6) % 7;
  return addDays(date, -adjusted);
}

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function endOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

function weekLabel(start: Date, end: Date): string {
  const sameMonth = start.getUTCMonth() === end.getUTCMonth();
  const startStr = `${MONTH_SHORT[start.getUTCMonth()]} ${start.getUTCDate()}`;
  const endStr = sameMonth
    ? `${end.getUTCDate()}`
    : `${MONTH_SHORT[end.getUTCMonth()]} ${end.getUTCDate()}`;
  return `${startStr}-${endStr}`;
}

function monthLabel(date: Date): string {
  return `${MONTH_LABELS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export function buildBuckets(
  rangeStart: string,
  rangeEnd: string,
  periodType: ReportPeriodType,
  scope: ReportScope,
  periodAnchor?: string
): ReportBucket[] {
  const buckets: ReportBucket[] = [];

  if (scope === "single") {
    const anchor = parseISODate(periodAnchor ?? rangeStart);
    if (periodType === "weekly") {
      const start = startOfWeek(anchor);
      const end = addDays(start, 6);
      buckets.push({
        label: weekLabel(start, end),
        start: formatISODate(start),
        end: formatISODate(end),
      });
    } else {
      const start = startOfMonth(anchor);
      const end = endOfMonth(anchor);
      buckets.push({
        label: monthLabel(anchor),
        start: formatISODate(start),
        end: formatISODate(end),
      });
    }
    return buckets;
  }

  const start = parseISODate(rangeStart);
  const end = parseISODate(rangeEnd);

  if (periodType === "weekly") {
    let cursor = startOfWeek(start);
    while (cursor.getTime() <= end.getTime()) {
      const bucketEnd = addDays(cursor, 6);
      buckets.push({
        label: weekLabel(cursor, bucketEnd),
        start: formatISODate(cursor),
        end: formatISODate(bucketEnd),
      });
      cursor = addDays(cursor, 7);
    }
  } else {
    let cursor = startOfMonth(start);
    while (cursor.getTime() <= end.getTime()) {
      const bucketEnd = endOfMonth(cursor);
      buckets.push({
        label: monthLabel(cursor),
        start: formatISODate(cursor),
        end: formatISODate(bucketEnd),
      });
      cursor = new Date(
        Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1)
      );
    }
  }

  return buckets;
}

function findBucketIndex(buckets: ReportBucket[], dateStr: string): number {
  for (let i = 0; i < buckets.length; i++) {
    if (dateStr >= buckets[i].start && dateStr <= buckets[i].end) return i;
  }
  return -1;
}

export interface ComputeReportInput {
  schedule: Pick<Schedule, "id" | "name" | "startDate" | "endDate">;
  sessions: Session[];
  slots: SessionSlot[];
  staff: Staff[];
  periodType: ReportPeriodType;
  scope: ReportScope;
  periodAnchor?: string;
}

export interface ComputedReport {
  payload: ReportPayload;
  periodStart: string;
  periodEnd: string;
}

export function computeReport(input: ComputeReportInput): ComputedReport {
  const { schedule, sessions, slots, staff, periodType, scope, periodAnchor } =
    input;

  const buckets = buildBuckets(
    schedule.startDate,
    schedule.endDate,
    periodType,
    scope,
    periodAnchor
  );

  const periodStart = buckets[0]?.start ?? schedule.startDate;
  const periodEnd = buckets[buckets.length - 1]?.end ?? schedule.endDate;

  const sessionMap = new Map<string, Session>();
  for (const s of sessions) {
    if (s.scheduleId === schedule.id) sessionMap.set(s.id, s);
  }

  const hoursByStaff = new Map<string, number[]>();
  for (const member of staff) {
    hoursByStaff.set(member.id, new Array(buckets.length).fill(0));
  }

  for (const slot of slots) {
    if (!slot.assignedStaffId) continue;
    const session = sessionMap.get(slot.sessionId);
    if (!session) continue;
    const bucketIdx = findBucketIndex(buckets, session.date);
    if (bucketIdx < 0) continue;
    const h = hoursBetween(session.startTime, session.endTime);
    const arr = hoursByStaff.get(slot.assignedStaffId);
    if (!arr) continue;
    arr[bucketIdx] += h;
  }

  const rows: ReportRow[] = staff
    .map<ReportRow>((member) => {
      const vals = hoursByStaff.get(member.id) ?? [];
      const total = vals.reduce((a, b) => a + b, 0);
      return {
        staffId: member.id,
        staffName: `${member.firstName} ${member.lastName}`.trim(),
        role: member.role,
        buckets: vals,
        total,
      };
    })
    .filter((r) => r.total > 0)
    .sort(
      (a, b) => b.total - a.total || a.staffName.localeCompare(b.staffName)
    );

  const totalHours = rows.reduce((a, r) => a + r.total, 0);

  return {
    payload: { buckets, rows, totalHours },
    periodStart,
    periodEnd,
  };
}

export function formatReportName(
  scheduleName: string,
  periodType: ReportPeriodType,
  scope: ReportScope,
  periodStart: string,
  periodEnd: string
): string {
  const typeLabel = periodType === "weekly" ? "Weekly" : "Monthly";
  if (scope === "single") {
    const anchor = parseISODate(periodStart);
    const suffix =
      periodType === "weekly"
        ? `week of ${MONTH_SHORT[anchor.getUTCMonth()]} ${anchor.getUTCDate()}, ${anchor.getUTCFullYear()}`
        : monthLabel(anchor);
    return `${scheduleName} - ${typeLabel} hours (${suffix})`;
  }
  return `${scheduleName} - ${typeLabel} hours breakdown (${periodStart} to ${periodEnd})`;
}
