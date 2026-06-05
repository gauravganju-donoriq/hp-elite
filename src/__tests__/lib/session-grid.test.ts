import { describe, it, expect } from "vitest";
import { buildSessionGrid, sessionGridKey } from "@/lib/session-grid";
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

describe("buildSessionGrid", () => {
  it("keeps multiple sessions sharing the same date and time window in one cell", () => {
    const a = makeSession({ id: "a", location: "Field House" });
    const b = makeSession({ id: "b", location: "K Sport" });

    const grid = buildSessionGrid([a, b]);
    const cell = grid.get(sessionGridKey("2026-06-08", "9:00 AM", "3:00 PM"));

    expect(cell).toBeDefined();
    expect(cell).toHaveLength(2);
    expect(cell!.map((s) => s.id).sort()).toEqual(["a", "b"]);
  });

  it("separates sessions with different time windows on the same day", () => {
    const morning = makeSession({ id: "m", startTime: "9:00 AM", endTime: "3:00 PM" });
    const evening = makeSession({ id: "e", startTime: "5:00 PM", endTime: "8:00 PM" });

    const grid = buildSessionGrid([morning, evening]);

    expect(grid.get(sessionGridKey("2026-06-08", "9:00 AM", "3:00 PM"))).toHaveLength(1);
    expect(grid.get(sessionGridKey("2026-06-08", "5:00 PM", "8:00 PM"))).toHaveLength(1);
  });

  it("returns an empty map for no sessions", () => {
    expect(buildSessionGrid([]).size).toBe(0);
  });
});
