import { describe, it, expect } from "vitest";
import { buildCalendarWeeks } from "@/lib/availability-calendar";
import type { Session } from "@/lib/types";

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: "sess-1",
    scheduleId: "sch-1",
    date: "2026-06-08",
    dayOfWeek: "Monday",
    startTime: "9:00 AM",
    endTime: "3:00 PM",
    location: "Field House",
    requiredStaff: 4,
    ...overrides,
  };
}

function findDay(weeks: ReturnType<typeof buildCalendarWeeks>, date: string) {
  for (const week of weeks) {
    const day = week.find((d) => d.date === date);
    if (day) return day;
  }
  return undefined;
}

describe("buildCalendarWeeks", () => {
  it("keeps both morning and evening sessions on the same day", () => {
    const morning = makeSession({ id: "m", startTime: "9:00 AM", endTime: "3:00 PM" });
    const evening = makeSession({ id: "e", startTime: "5:00 PM", endTime: "8:00 PM" });

    const weeks = buildCalendarWeeks([evening, morning]);
    const day = findDay(weeks, "2026-06-08");

    expect(day).toBeDefined();
    expect(day!.sessions).toHaveLength(2);
    // Sorted by start time, so morning comes before evening.
    expect(day!.sessions.map((s) => s.id)).toEqual(["m", "e"]);
  });

  it("leaves days without sessions empty", () => {
    const weeks = buildCalendarWeeks([makeSession({ date: "2026-06-08" })]);
    const emptyDay = findDay(weeks, "2026-06-09");

    expect(emptyDay).toBeDefined();
    expect(emptyDay!.sessions).toHaveLength(0);
  });

  it("returns no weeks for no sessions", () => {
    expect(buildCalendarWeeks([])).toEqual([]);
  });
});
