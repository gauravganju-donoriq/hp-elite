import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockQuery, mockClientQuery, mockClientRelease, mockConnect } = vi.hoisted(() => {
  const mockQuery = vi.fn();
  const mockClientQuery = vi.fn();
  const mockClientRelease = vi.fn();
  const mockConnect = vi.fn();
  return { mockQuery, mockClientQuery, mockClientRelease, mockConnect };
});

vi.mock("@/lib/db", () => ({
  default: {
    query: mockQuery,
    connect: mockConnect,
  },
}));

import {
  getAllStaff,
  getStaffById,
  getStaffByUserId,
  createStaff,
  updateStaff,
  deleteStaff,
  getAllSchedules,
  getScheduleById,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getSessionsByScheduleId,
  getSessionById,
  createSessions,
  updateSession,
  deleteSession,
  getAvailabilityByStaff,
  getAvailabilityBySession,
  getAllAvailability,
  upsertAvailability,
  bulkUpsertAvailability,
  deleteAvailability,
  getSessionStaffCounts,
  getSlotsForSession,
  getAllSlots,
  initializeSlotsForSession,
  assignStaffToSlot,
  unassignSlot,
  autoAssignSession,
} from "@/lib/queries";

// --------------- Fixtures ---------------

const staffRow = {
  id: "s1",
  user_id: "u1",
  first_name: "John",
  last_name: "Doe",
  role: "lead",
  years_experience: 5,
};

const mappedStaff = {
  id: "s1",
  userId: "u1",
  firstName: "John",
  lastName: "Doe",
  role: "lead",
  yearsExperience: 5,
};

const sessionRow = {
  id: "sess1",
  schedule_id: "sch1",
  date: "2025-06-15",
  day_of_week: "Monday",
  start_time: "09:00",
  end_time: "10:00",
  location: "Field A",
  required_staff: 2,
  class_type: "hp-speed",
};

const mappedSession = {
  id: "sess1",
  scheduleId: "sch1",
  date: "2025-06-15",
  dayOfWeek: "Monday",
  startTime: "09:00",
  endTime: "10:00",
  location: "Field A",
  requiredStaff: 2,
  classType: "hp-speed",
};

const scheduleRow = {
  id: "sch1",
  name: "Summer",
  description: "Summer program",
  start_date: "2025-06-01",
  end_date: "2025-08-31",
};

const availRow = {
  staff_id: "s1",
  session_id: "sess1",
  status: "available",
  custom_start_time: null,
  custom_end_time: null,
  notes: null,
};

const slotRow = {
  id: "slot-sess1-0",
  session_id: "sess1",
  slot_index: 0,
  assigned_staff_id: null,
};

// --------------- Helpers ---------------

beforeEach(() => {
  vi.clearAllMocks();
  mockConnect.mockResolvedValue({
    query: mockClientQuery,
    release: mockClientRelease,
  });
});

// =============== Staff ===============

describe("getAllStaff", () => {
  it("returns mapped staff array", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [staffRow] });
    const result = await getAllStaff();
    expect(result).toEqual([mappedStaff]);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("ORDER BY last_name")
    );
  });

  it("returns empty array when no staff", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await getAllStaff();
    expect(result).toEqual([]);
  });
});

describe("getStaffById", () => {
  it("returns staff when found", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [staffRow] });
    const result = await getStaffById("s1");
    expect(result).toEqual(mappedStaff);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("WHERE id = $1"), ["s1"]);
  });

  it("returns null when not found", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await getStaffById("missing");
    expect(result).toBeNull();
  });
});

describe("getStaffByUserId", () => {
  it("returns staff when found", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [staffRow] });
    const result = await getStaffByUserId("u1");
    expect(result).toEqual(mappedStaff);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("user_id = $1"), ["u1"]);
  });

  it("returns null when not found", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    expect(await getStaffByUserId("missing")).toBeNull();
  });
});

describe("createStaff", () => {
  it("inserts and returns mapped staff", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [staffRow] });
    const result = await createStaff({
      id: "s1",
      firstName: "John",
      lastName: "Doe",
      role: "lead",
      yearsExperience: 5,
      userId: "u1",
    });
    expect(result).toEqual(mappedStaff);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO staff"),
      ["s1", "u1", "John", "Doe", "lead", 5]
    );
  });

  it("passes null for userId when omitted", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ ...staffRow, user_id: null }] });
    await createStaff({
      id: "s2",
      firstName: "Jane",
      lastName: "Doe",
      role: "junior",
      yearsExperience: 0,
    });
    expect(mockQuery).toHaveBeenCalledWith(
      expect.any(String),
      ["s2", null, "Jane", "Doe", "junior", 0]
    );
  });
});

describe("updateStaff", () => {
  it("updates specified fields", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ ...staffRow, first_name: "Jane" }] });
    const result = await updateStaff("s1", { firstName: "Jane" });
    expect(result?.firstName).toBe("Jane");
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("SET first_name = $1"),
      ["Jane", "s1"]
    );
  });

  it("returns existing staff when no fields to update", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [staffRow] });
    const result = await updateStaff("s1", {});
    expect(result).toEqual(mappedStaff);
  });

  it("returns null when staff not found", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await updateStaff("missing", { firstName: "X" });
    expect(result).toBeNull();
  });
});

describe("deleteStaff", () => {
  it("returns true when deleted", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
    expect(await deleteStaff("s1")).toBe(true);
  });

  it("returns false when not found", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });
    expect(await deleteStaff("missing")).toBe(false);
  });
});

// =============== Schedules ===============

describe("getAllSchedules", () => {
  it("returns schedules with nested sessions", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [scheduleRow] })
      .mockResolvedValueOnce({ rows: [sessionRow] });

    const result = await getAllSchedules();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Summer");
    expect(result[0].sessions).toHaveLength(1);
    expect(result[0].sessions[0].id).toBe("sess1");
  });

  it("returns empty array when no schedules", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    expect(await getAllSchedules()).toEqual([]);
  });
});

describe("getScheduleById", () => {
  it("returns schedule with sessions when found", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [scheduleRow] })
      .mockResolvedValueOnce({ rows: [sessionRow] });

    const result = await getScheduleById("sch1");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("sch1");
    expect(result!.sessions).toHaveLength(1);
  });

  it("returns null when not found", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    expect(await getScheduleById("missing")).toBeNull();
  });
});

describe("createSchedule", () => {
  it("inserts and returns schedule with empty sessions", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await createSchedule({
      id: "sch1",
      name: "Summer",
      description: "Summer program",
      startDate: "2025-06-01",
      endDate: "2025-08-31",
    });
    expect(result.sessions).toEqual([]);
    expect(result.id).toBe("sch1");
  });
});

describe("updateSchedule", () => {
  it("updates specified fields", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
    const result = await updateSchedule("sch1", { name: "Winter" });
    expect(result).toBe(true);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("SET name = $1"),
      ["Winter", "sch1"]
    );
  });

  it("returns true when no fields to update", async () => {
    expect(await updateSchedule("sch1", {})).toBe(true);
    expect(mockQuery).not.toHaveBeenCalled();
  });
});

describe("deleteSchedule", () => {
  it("returns true when deleted", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
    expect(await deleteSchedule("sch1")).toBe(true);
  });

  it("returns false when not found", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });
    expect(await deleteSchedule("missing")).toBe(false);
  });
});

// =============== Sessions ===============

describe("getSessionsByScheduleId", () => {
  it("returns mapped sessions", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [sessionRow] });
    const result = await getSessionsByScheduleId("sch1");
    expect(result).toEqual([mappedSession]);
  });
});

describe("getSessionById", () => {
  it("returns session when found", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [sessionRow] });
    expect(await getSessionById("sess1")).toEqual(mappedSession);
  });

  it("returns null when not found", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    expect(await getSessionById("missing")).toBeNull();
  });
});

describe("createSessions", () => {
  it("short-circuits for empty array", async () => {
    await createSessions([]);
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it("inserts sessions in a transaction", async () => {
    await createSessions([mappedSession]);
    expect(mockClientQuery).toHaveBeenCalledWith("BEGIN");
    expect(mockClientQuery).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO training_session"),
      expect.arrayContaining(["sess1", "sch1"])
    );
    expect(mockClientQuery).toHaveBeenCalledWith("COMMIT");
    expect(mockClientRelease).toHaveBeenCalled();
  });

  it("rolls back on error", async () => {
    mockClientQuery
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockRejectedValueOnce(new Error("insert fail"));

    await expect(createSessions([mappedSession])).rejects.toThrow("insert fail");
    expect(mockClientQuery).toHaveBeenCalledWith("ROLLBACK");
    expect(mockClientRelease).toHaveBeenCalled();
  });
});

describe("updateSession", () => {
  it("updates specified fields", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
    expect(await updateSession("sess1", { location: "Field B" })).toBe(true);
  });

  it("returns true when no fields to update", async () => {
    expect(await updateSession("sess1", {})).toBe(true);
  });
});

describe("deleteSession", () => {
  it("returns true when deleted", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
    expect(await deleteSession("sess1")).toBe(true);
  });

  it("returns false when not found", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });
    expect(await deleteSession("missing")).toBe(false);
  });
});

// =============== Availability ===============

describe("getAvailabilityByStaff", () => {
  it("returns mapped availability rows", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [availRow] });
    const result = await getAvailabilityByStaff("s1");
    expect(result).toEqual([
      {
        staffId: "s1",
        sessionId: "sess1",
        status: "available",
        customStartTime: undefined,
        customEndTime: undefined,
        notes: undefined,
      },
    ]);
  });
});

describe("getAvailabilityBySession", () => {
  it("returns availability for a session", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [availRow] });
    const result = await getAvailabilityBySession("sess1");
    expect(result[0].staffId).toBe("s1");
  });
});

describe("getAllAvailability", () => {
  it("returns all rows", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [availRow, { ...availRow, staff_id: "s2" }] });
    const result = await getAllAvailability();
    expect(result).toHaveLength(2);
  });
});

describe("upsertAvailability", () => {
  it("executes upsert with correct params", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await upsertAvailability({
      staffId: "s1",
      sessionId: "sess1",
      status: "available",
      notes: "morning only",
    });
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("ON CONFLICT"),
      ["s1", "sess1", "available", null, null, "morning only"]
    );
  });
});

describe("bulkUpsertAvailability", () => {
  it("short-circuits for empty array", async () => {
    await bulkUpsertAvailability([]);
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it("upserts in a transaction", async () => {
    mockClientQuery.mockResolvedValue({});
    await bulkUpsertAvailability([
      { staffId: "s1", sessionId: "sess1", status: "available" as const },
    ]);
    expect(mockClientQuery).toHaveBeenCalledWith("BEGIN");
    expect(mockClientQuery).toHaveBeenCalledWith(
      expect.stringContaining("ON CONFLICT"),
      expect.arrayContaining(["s1", "sess1", "available"])
    );
    expect(mockClientQuery).toHaveBeenCalledWith("COMMIT");
  });

  it("rolls back on error", async () => {
    mockClientQuery
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("bulk fail"));

    await expect(
      bulkUpsertAvailability([
        { staffId: "s1", sessionId: "sess1", status: "available" as const },
      ])
    ).rejects.toThrow("bulk fail");
    expect(mockClientQuery).toHaveBeenCalledWith("ROLLBACK");
  });
});

describe("deleteAvailability", () => {
  it("returns true when deleted", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
    expect(await deleteAvailability("s1", "sess1")).toBe(true);
  });

  it("returns false when not found", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });
    expect(await deleteAvailability("s1", "missing")).toBe(false);
  });
});

describe("getSessionStaffCounts", () => {
  it("parses confirmed, maybe, and total", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ confirmed: "3", maybe: "2" }] });
    const result = await getSessionStaffCounts("sess1");
    expect(result).toEqual({ confirmed: 3, maybe: 2, total: 5 });
  });

  it("handles zero counts", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ confirmed: "0", maybe: "0" }] });
    const result = await getSessionStaffCounts("sess1");
    expect(result).toEqual({ confirmed: 0, maybe: 0, total: 0 });
  });
});

// =============== Slots ===============

describe("getSlotsForSession", () => {
  it("returns mapped slot rows", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [slotRow] });
    const result = await getSlotsForSession("sess1");
    expect(result).toEqual([
      { id: "slot-sess1-0", sessionId: "sess1", slotIndex: 0, assignedStaffId: undefined },
    ]);
  });
});

describe("getAllSlots", () => {
  it("returns all slot rows", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [slotRow] });
    const result = await getAllSlots();
    expect(result).toHaveLength(1);
  });
});

describe("initializeSlotsForSession", () => {
  it("returns existing slots when count is already met", async () => {
    const existingSlots = [slotRow, { ...slotRow, id: "slot-sess1-1", slot_index: 1 }];
    mockQuery.mockResolvedValueOnce({ rows: existingSlots });

    const result = await initializeSlotsForSession("sess1", 2);
    expect(result).toHaveLength(2);
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it("creates missing slots in a transaction", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [slotRow] }) // existing: 1 slot
      .mockResolvedValueOnce({ rows: [slotRow, { ...slotRow, id: "slot-sess1-1", slot_index: 1 }] }); // re-fetch after insert
    mockClientQuery.mockResolvedValue({});

    const result = await initializeSlotsForSession("sess1", 2);
    expect(mockClientQuery).toHaveBeenCalledWith("BEGIN");
    expect(mockClientQuery).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO session_slot"),
      ["slot-sess1-1", "sess1", 1]
    );
    expect(mockClientQuery).toHaveBeenCalledWith("COMMIT");
    expect(result).toHaveLength(2);
  });
});

describe("assignStaffToSlot", () => {
  it("returns true when updated", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
    expect(await assignStaffToSlot("slot1", "s1")).toBe(true);
  });

  it("returns false when slot not found", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });
    expect(await assignStaffToSlot("missing", "s1")).toBe(false);
  });
});

describe("unassignSlot", () => {
  it("returns true when cleared", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
    expect(await unassignSlot("slot1")).toBe(true);
  });

  it("returns false when slot not found", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });
    expect(await unassignSlot("missing")).toBe(false);
  });
});

// =============== Auto-Assign ===============

describe("autoAssignSession", () => {
  it("returns empty result for non-existent session", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // getSessionById -> no session
    const result = await autoAssignSession("missing");
    expect(result).toEqual({ assigned: 0, empty: 0, conflicts: [] });
  });

  it("assigns available staff sorted by experience and role", async () => {
    const staff1 = { ...staffRow, id: "s1", years_experience: 5, role: "lead" };
    const staff2 = { ...staffRow, id: "s2", years_experience: 3, role: "experience" };
    const staff3 = { ...staffRow, id: "s3", years_experience: 3, role: "junior" };

    const session = { ...sessionRow, required_staff: 2 };

    mockQuery
      .mockResolvedValueOnce({ rows: [session] }) // getSessionById
      .mockResolvedValueOnce({ rows: [staff1, staff2, staff3] }) // getAllStaff
      .mockResolvedValueOnce({
        rows: [
          { ...availRow, staff_id: "s1", status: "available" },
          { ...availRow, staff_id: "s2", status: "available" },
          { ...availRow, staff_id: "s3", status: "available" },
        ],
      }) // getAllAvailability
      .mockResolvedValueOnce({
        rows: [
          { ...slotRow, id: "slot-sess1-0", slot_index: 0 },
          { ...slotRow, id: "slot-sess1-1", slot_index: 1 },
        ],
      }); // getAllSlots

    mockClientQuery.mockResolvedValue({});

    const result = await autoAssignSession("sess1");
    expect(result.assigned).toBe(2);
    expect(result.empty).toBe(0);
    expect(result.conflicts).toHaveLength(0);

    const assignCalls = mockClientQuery.mock.calls.filter(
      (c: unknown[]) => typeof c[0] === "string" && c[0].includes("UPDATE session_slot SET assigned_staff_id")
    );
    expect(assignCalls).toHaveLength(2);
    // s1 has most experience (5) -> assigned first
    expect(assignCalls[0][1]).toEqual(["s1", "slot-sess1-0"]);
    // s2 has more experience than s3 (3 vs 3) but better role priority
    expect(assignCalls[1][1]).toEqual(["s2", "slot-sess1-1"]);
  });

  it("generates conflict when not enough available staff", async () => {
    const session = { ...sessionRow, required_staff: 3 };

    mockQuery
      .mockResolvedValueOnce({ rows: [session] })
      .mockResolvedValueOnce({ rows: [staffRow] }) // 1 staff
      .mockResolvedValueOnce({
        rows: [{ ...availRow, staff_id: "s1", status: "available" }],
      })
      .mockResolvedValueOnce({
        rows: [
          { ...slotRow, id: "slot-0", session_id: "sess1", slot_index: 0 },
          { ...slotRow, id: "slot-1", session_id: "sess1", slot_index: 1 },
          { ...slotRow, id: "slot-2", session_id: "sess1", slot_index: 2 },
        ],
      });

    mockClientQuery.mockResolvedValue({});

    const result = await autoAssignSession("sess1");
    expect(result.assigned).toBe(1);
    expect(result.empty).toBe(2);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].unfilledCount).toBe(2);
    expect(result.conflicts[0].reason).toContain("staff marked available");
  });

  it("generates conflict mentioning 'maybe' staff", async () => {
    const session = { ...sessionRow, required_staff: 2 };
    const s1 = { ...staffRow, id: "s1" };
    const s2 = { ...staffRow, id: "s2" };

    mockQuery
      .mockResolvedValueOnce({ rows: [session] })
      .mockResolvedValueOnce({ rows: [s1, s2] })
      .mockResolvedValueOnce({
        rows: [
          { ...availRow, staff_id: "s1", status: "available" },
          { ...availRow, staff_id: "s2", status: "maybe" },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { ...slotRow, id: "slot-0", session_id: "sess1", slot_index: 0 },
          { ...slotRow, id: "slot-1", session_id: "sess1", slot_index: 1 },
        ],
      });

    mockClientQuery.mockResolvedValue({});

    const result = await autoAssignSession("sess1");
    expect(result.assigned).toBe(1);
    expect(result.empty).toBe(1);
    expect(result.conflicts[0].reason).toContain("maybe");
  });

  it("generates conflict when no one has responded", async () => {
    const session = { ...sessionRow, required_staff: 2 };

    mockQuery
      .mockResolvedValueOnce({ rows: [session] })
      .mockResolvedValueOnce({ rows: [staffRow] })
      .mockResolvedValueOnce({ rows: [] }) // no availability
      .mockResolvedValueOnce({
        rows: [
          { ...slotRow, id: "slot-0", session_id: "sess1", slot_index: 0 },
          { ...slotRow, id: "slot-1", session_id: "sess1", slot_index: 1 },
        ],
      });

    mockClientQuery.mockResolvedValue({});

    const result = await autoAssignSession("sess1");
    expect(result.conflicts[0].reason).toContain("No staff have responded");
  });

  it("creates missing slots when requiredStaff > existing slots", async () => {
    const session = { ...sessionRow, required_staff: 2 };

    mockQuery
      .mockResolvedValueOnce({ rows: [session] })
      .mockResolvedValueOnce({ rows: [staffRow] })
      .mockResolvedValueOnce({
        rows: [{ ...availRow, staff_id: "s1", status: "available" }],
      })
      .mockResolvedValueOnce({ rows: [] }); // no existing slots

    mockClientQuery.mockResolvedValue({});

    await autoAssignSession("sess1");

    const insertCalls = mockClientQuery.mock.calls.filter(
      (c: unknown[]) => typeof c[0] === "string" && c[0].includes("INSERT INTO session_slot")
    );
    expect(insertCalls).toHaveLength(2);
  });

  it("rolls back on error during assignment", async () => {
    const session = { ...sessionRow, required_staff: 1 };

    mockQuery
      .mockResolvedValueOnce({ rows: [session] })
      .mockResolvedValueOnce({ rows: [staffRow] })
      .mockResolvedValueOnce({
        rows: [{ ...availRow, staff_id: "s1", status: "available" }],
      })
      .mockResolvedValueOnce({
        rows: [{ ...slotRow, id: "slot-0", session_id: "sess1", slot_index: 0 }],
      });

    mockClientQuery
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockRejectedValueOnce(new Error("assign fail"));

    await expect(autoAssignSession("sess1")).rejects.toThrow("assign fail");
    expect(mockClientQuery).toHaveBeenCalledWith("ROLLBACK");
    expect(mockClientRelease).toHaveBeenCalled();
  });
});
