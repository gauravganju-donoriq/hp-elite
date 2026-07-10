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
  clearAssignmentsForSessions,
  autoAssignSession,
  isStaffDoubleBooked,
  getAllAutoAssignProfiles,
  getAutoAssignProfile,
  createAutoAssignProfile,
  updateAutoAssignProfile,
  deleteAutoAssignProfile,
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
  // resetAllMocks (not clearAllMocks) also drains any queued mockResolvedValueOnce
  // values, so a test that throws mid-way can't leak stale responses into the next.
  vi.resetAllMocks();
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

// setSlotCount now always runs inside a transaction (client.query): BEGIN,
// verify the session exists, DELETE excess, SELECT existing slot_index,
// INSERT each missing slot, COMMIT, then re-reads via getSlotsForSession
// (pool.query / mockQuery).
function mockSetSlotCountClient(existingIndexes: number[], sessionExists = true) {
  mockClientQuery.mockImplementation((sql: unknown) => {
    if (typeof sql === "string" && sql.includes("FROM training_session")) {
      return Promise.resolve({ rows: sessionExists ? [{ "?column?": 1 }] : [] });
    }
    if (typeof sql === "string" && sql.includes("SELECT slot_index")) {
      return Promise.resolve({
        rows: existingIndexes.map((i) => ({ slot_index: i })),
      });
    }
    return Promise.resolve({});
  });
}

describe("initializeSlotsForSession", () => {
  it("returns existing slots when count is already met (no inserts)", async () => {
    const existingSlots = [slotRow, { ...slotRow, id: "slot-sess1-1", slot_index: 1 }];
    mockSetSlotCountClient([0, 1]);
    mockQuery.mockResolvedValueOnce({ rows: existingSlots }); // getSlotsForSession re-read

    const result = await initializeSlotsForSession("sess1", 2);

    expect(result).toHaveLength(2);
    expect(mockConnect).toHaveBeenCalled();
    expect(mockClientQuery).toHaveBeenCalledWith("BEGIN");
    expect(mockClientQuery).toHaveBeenCalledWith("COMMIT");
    const insertCalls = mockClientQuery.mock.calls.filter(
      (c: unknown[]) =>
        typeof c[0] === "string" && c[0].includes("INSERT INTO session_slot")
    );
    expect(insertCalls).toHaveLength(0);
  });

  it("creates missing slots in a transaction", async () => {
    mockSetSlotCountClient([0]); // 1 existing slot (index 0)
    mockQuery.mockResolvedValueOnce({
      rows: [slotRow, { ...slotRow, id: "slot-sess1-1", slot_index: 1 }],
    }); // getSlotsForSession re-read

    const result = await initializeSlotsForSession("sess1", 2);

    expect(mockClientQuery).toHaveBeenCalledWith("BEGIN");
    expect(mockClientQuery).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO session_slot"),
      ["slot-sess1-1", "sess1", 1]
    );
    expect(mockClientQuery).toHaveBeenCalledWith("COMMIT");
    expect(result).toHaveLength(2);
  });

  it("skips gracefully when the session does not exist yet (no FK crash)", async () => {
    mockSetSlotCountClient([], false); // session row not present

    const result = await initializeSlotsForSession("sess-missing", 2);

    expect(result).toEqual([]);
    expect(mockClientQuery).toHaveBeenCalledWith("BEGIN");
    expect(mockClientQuery).toHaveBeenCalledWith("ROLLBACK");
    const insertCalls = mockClientQuery.mock.calls.filter(
      (c: unknown[]) =>
        typeof c[0] === "string" && c[0].includes("INSERT INTO session_slot")
    );
    expect(insertCalls).toHaveLength(0);
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

describe("clearAssignmentsForSessions", () => {
  it("returns 0 and does not query for an empty list", async () => {
    const cleared = await clearAssignmentsForSessions([]);
    expect(cleared).toBe(0);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("clears assignments for the given sessions", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 3 });
    const cleared = await clearAssignmentsForSessions(["sess1", "sess2"]);
    expect(cleared).toBe(3);
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain("UPDATE session_slot");
    expect(sql).toContain("assigned_staff_id = NULL");
    expect(params).toEqual([["sess1", "sess2"]]);
  });
});

describe("auto-assign profiles", () => {
  const profileRow = {
    id: "most-experienced",
    name: "Most Experienced",
    plan: [{ roles: ["lead", "experience"], preferSeniorFirst: true }],
    sort_order: 40,
    is_builtin: true,
  };

  it("getAllAutoAssignProfiles maps rows", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [profileRow] });
    const profiles = await getAllAutoAssignProfiles();
    expect(profiles).toEqual([
      {
        id: "most-experienced",
        name: "Most Experienced",
        plan: [{ roles: ["lead", "experience"], preferSeniorFirst: true }],
        sortOrder: 40,
        isBuiltin: true,
      },
    ]);
  });

  it("getAutoAssignProfile parses a JSON string plan", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ ...profileRow, plan: JSON.stringify(profileRow.plan) }],
    });
    const profile = await getAutoAssignProfile("most-experienced");
    expect(profile?.plan).toEqual([
      { roles: ["lead", "experience"], preferSeniorFirst: true },
    ]);
  });

  it("getAutoAssignProfile returns null when missing", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    expect(await getAutoAssignProfile("nope")).toBeNull();
  });

  it("createAutoAssignProfile serializes the plan", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [profileRow] });
    await createAutoAssignProfile({
      id: "most-experienced",
      name: "Most Experienced",
      plan: [{ roles: ["lead", "experience"], preferSeniorFirst: true }],
      sortOrder: 40,
    });
    const [, params] = mockQuery.mock.calls[0];
    expect(params[2]).toBe(
      JSON.stringify([{ roles: ["lead", "experience"], preferSeniorFirst: true }])
    );
  });

  it("updateAutoAssignProfile returns existing when no updates", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [profileRow] });
    const updated = await updateAutoAssignProfile("most-experienced", {});
    expect(updated?.id).toBe("most-experienced");
    const [sql] = mockQuery.mock.calls[0];
    expect(sql).toContain("SELECT");
  });

  it("deleteAutoAssignProfile returns true when deleted", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
    expect(await deleteAutoAssignProfile("most-experienced")).toBe(true);
  });
});

describe("autoAssignSession with explicit plan", () => {
  it("accepts a plan array (e.g. a profile plan)", async () => {
    const exp = { ...staffRow, id: "s-exp", years_experience: 9, role: "experience" };
    const junior = { ...staffRow, id: "s-jr", years_experience: 1, role: "junior" };
    mockAutoAssignClient({
      session: { ...sessionRow, required_staff: 2 },
      slots: [
        { id: "slot1", session_id: "sess1", slot_index: 0, assigned_staff_id: null },
        { id: "slot2", session_id: "sess1", slot_index: 1, assigned_staff_id: null },
      ],
      staff: [exp, junior],
      availability: [
        { staff_id: "s-exp", session_id: "sess1", status: "available" },
        { staff_id: "s-jr", session_id: "sess1", status: "available" },
      ],
    });

    const result = await autoAssignSession("sess1", [
      { roles: ["lead", "experience", "junior", "trial"], preferSeniorFirst: true },
    ]);
    expect(result.assigned).toBe(2);

    const assignCalls = mockClientQuery.mock.calls.filter(
      ([sql]) =>
        typeof sql === "string" &&
        sql.includes("UPDATE session_slot SET assigned_staff_id")
    );
    // Most experienced first: s-exp should be assigned before s-jr.
    expect(assignCalls[0][1]).toEqual(["s-exp", "slot1"]);
  });
});

// =============== Auto-Assign ===============

// autoAssignSession runs entirely inside a transaction; every read/write goes
// through the pooled client (mockClientQuery). This helper answers each query by
// inspecting its SQL so tests don't depend on call ordering or optional queries.
function mockAutoAssignClient(opts: {
  session: Record<string, unknown> | null;
  staff?: Record<string, unknown>[];
  availability?: Record<string, unknown>[];
  slots?: Record<string, unknown>[];
  overlapSessions?: Record<string, unknown>[];
  conflictStaffIds?: string[];
}) {
  const {
    session,
    staff = [],
    availability = [],
    slots = [],
    overlapSessions = [],
    conflictStaffIds = [],
  } = opts;
  // Global fairness counts query reflects every existing assignment; derive it
  // from the session's own slots (the only assignments present in these tests).
  const globalAssignments = slots
    .filter((s) => s.assigned_staff_id)
    .map((s) => ({ assigned_staff_id: s.assigned_staff_id }));

  mockClientQuery.mockImplementation((sql: unknown) => {
    if (typeof sql !== "string") return Promise.resolve({});
    if (sql.includes("training_session WHERE id = $1 FOR UPDATE")) {
      return Promise.resolve({ rows: session ? [session] : [] });
    }
    if (sql.includes("FROM session_slot WHERE session_id = $1") && sql.includes("FOR UPDATE")) {
      return Promise.resolve({ rows: slots });
    }
    if (sql.includes("FROM staff")) {
      return Promise.resolve({ rows: staff });
    }
    if (sql.includes("FROM availability WHERE session_id")) {
      return Promise.resolve({ rows: availability });
    }
    if (sql.includes("WHERE date = $1 AND id <> $2")) {
      return Promise.resolve({ rows: overlapSessions });
    }
    if (sql.includes("SELECT DISTINCT assigned_staff_id")) {
      return Promise.resolve({
        rows: conflictStaffIds.map((id) => ({ assigned_staff_id: id })),
      });
    }
    if (sql.includes("assigned_staff_id IS NOT NULL")) {
      return Promise.resolve({ rows: globalAssignments });
    }
    // BEGIN / COMMIT / ROLLBACK / DELETE / INSERT / UPDATE
    return Promise.resolve({});
  });
}

function assignCallsFor() {
  return mockClientQuery.mock.calls.filter(
    (c: unknown[]) =>
      typeof c[0] === "string" &&
      c[0].includes("UPDATE session_slot SET assigned_staff_id")
  );
}

describe("autoAssignSession", () => {
  it("returns empty result for non-existent session", async () => {
    mockAutoAssignClient({ session: null });
    const result = await autoAssignSession("missing");
    expect(result).toEqual({ assigned: 0, empty: 0, conflicts: [] });
  });

  it("assigns available staff sorted by experience and role", async () => {
    const staff1 = { ...staffRow, id: "s1", years_experience: 5, role: "lead" };
    const staff2 = { ...staffRow, id: "s2", years_experience: 3, role: "experience" };
    const staff3 = { ...staffRow, id: "s3", years_experience: 3, role: "junior" };

    mockAutoAssignClient({
      session: { ...sessionRow, required_staff: 2 },
      staff: [staff1, staff2, staff3],
      availability: [
        { ...availRow, staff_id: "s1", status: "available" },
        { ...availRow, staff_id: "s2", status: "available" },
        { ...availRow, staff_id: "s3", status: "available" },
      ],
      slots: [
        { ...slotRow, id: "slot-sess1-0", slot_index: 0 },
        { ...slotRow, id: "slot-sess1-1", slot_index: 1 },
      ],
    });

    const result = await autoAssignSession("sess1");
    expect(result.assigned).toBe(2);
    expect(result.empty).toBe(0);
    expect(result.conflicts).toHaveLength(0);

    const assignCalls = assignCallsFor();
    expect(assignCalls).toHaveLength(2);
    // s1 has most experience (5) -> assigned first
    expect(assignCalls[0][1]).toEqual(["s1", "slot-sess1-0"]);
    // s2 has more experience than s3 (3 vs 3) but better role priority
    expect(assignCalls[1][1]).toEqual(["s2", "slot-sess1-1"]);
  });

  it("generates conflict when not enough available staff", async () => {
    mockAutoAssignClient({
      session: { ...sessionRow, required_staff: 3 },
      staff: [staffRow], // 1 staff
      availability: [{ ...availRow, staff_id: "s1", status: "available" }],
      slots: [
        { ...slotRow, id: "slot-0", session_id: "sess1", slot_index: 0 },
        { ...slotRow, id: "slot-1", session_id: "sess1", slot_index: 1 },
        { ...slotRow, id: "slot-2", session_id: "sess1", slot_index: 2 },
      ],
    });

    const result = await autoAssignSession("sess1");
    expect(result.assigned).toBe(1);
    expect(result.empty).toBe(2);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].unfilledCount).toBe(2);
    expect(result.conflicts[0].reason).toContain("staff marked available");
  });

  it("generates conflict mentioning 'maybe' staff", async () => {
    mockAutoAssignClient({
      session: { ...sessionRow, required_staff: 2 },
      staff: [
        { ...staffRow, id: "s1" },
        { ...staffRow, id: "s2" },
      ],
      availability: [
        { ...availRow, staff_id: "s1", status: "available" },
        { ...availRow, staff_id: "s2", status: "maybe" },
      ],
      slots: [
        { ...slotRow, id: "slot-0", session_id: "sess1", slot_index: 0 },
        { ...slotRow, id: "slot-1", session_id: "sess1", slot_index: 1 },
      ],
    });

    const result = await autoAssignSession("sess1");
    expect(result.assigned).toBe(1);
    expect(result.empty).toBe(1);
    expect(result.conflicts[0].reason).toContain("maybe");
  });

  it("generates conflict when no one has responded", async () => {
    mockAutoAssignClient({
      session: { ...sessionRow, required_staff: 2 },
      staff: [staffRow],
      availability: [], // no availability
      slots: [
        { ...slotRow, id: "slot-0", session_id: "sess1", slot_index: 0 },
        { ...slotRow, id: "slot-1", session_id: "sess1", slot_index: 1 },
      ],
    });

    const result = await autoAssignSession("sess1");
    expect(result.conflicts[0].reason).toContain("No staff have responded");
  });

  it("creates missing slots when requiredStaff > existing slots", async () => {
    mockAutoAssignClient({
      session: { ...sessionRow, required_staff: 2 },
      staff: [staffRow],
      availability: [{ ...availRow, staff_id: "s1", status: "available" }],
      slots: [], // no existing slots
    });

    await autoAssignSession("sess1");

    const insertCalls = mockClientQuery.mock.calls.filter(
      (c: unknown[]) =>
        typeof c[0] === "string" && c[0].includes("INSERT INTO session_slot")
    );
    expect(insertCalls).toHaveLength(2);
  });

  it("excludes staff already assigned to a time-overlapping session", async () => {
    // s1 is otherwise available but is already assigned to overlapping sess2.
    mockAutoAssignClient({
      session: { ...sessionRow, required_staff: 1 }, // 09:00-10:00
      staff: [
        { ...staffRow, id: "s1" },
        { ...staffRow, id: "s2" },
      ],
      availability: [
        { ...availRow, staff_id: "s1", status: "available" },
        { ...availRow, staff_id: "s2", status: "available" },
      ],
      slots: [{ ...slotRow, id: "slot-sess1-0", slot_index: 0 }],
      overlapSessions: [{ id: "sess2", start_time: "09:30", end_time: "10:30" }],
      conflictStaffIds: ["s1"],
    });

    const result = await autoAssignSession("sess1");
    expect(result.assigned).toBe(1);

    const assignCalls = assignCallsFor();
    // s1 is banned by the overlap, so s2 takes the slot.
    expect(assignCalls[0][1]).toEqual(["s2", "slot-sess1-0"]);
  });

  it("cheap strategy picks trials first, then juniors", async () => {
    const lead = { ...staffRow, id: "s-lead", years_experience: 8, role: "lead" };
    const exp = { ...staffRow, id: "s-exp", years_experience: 5, role: "experience" };
    const junior = { ...staffRow, id: "s-jr", years_experience: 1, role: "junior" };
    const trial = { ...staffRow, id: "s-tr", years_experience: 0, role: "trial" };

    mockAutoAssignClient({
      session: { ...sessionRow, required_staff: 2 },
      staff: [lead, exp, junior, trial],
      availability: [
        { ...availRow, staff_id: "s-lead", status: "available" },
        { ...availRow, staff_id: "s-exp", status: "available" },
        { ...availRow, staff_id: "s-jr", status: "available" },
        { ...availRow, staff_id: "s-tr", status: "available" },
      ],
      slots: [
        { ...slotRow, id: "slot-sess1-0", slot_index: 0 },
        { ...slotRow, id: "slot-sess1-1", slot_index: 1 },
      ],
    });

    const result = await autoAssignSession("sess1", "cheap");
    expect(result.assigned).toBe(2);

    const assignCalls = assignCallsFor();
    expect(assignCalls[0][1]).toEqual(["s-tr", "slot-sess1-0"]);
    expect(assignCalls[1][1]).toEqual(["s-jr", "slot-sess1-1"]);
  });

  it("balanced strategy picks 1 lead, 1 experience, rest juniors", async () => {
    const lead = { ...staffRow, id: "s-lead", years_experience: 8, role: "lead" };
    const exp = { ...staffRow, id: "s-exp", years_experience: 5, role: "experience" };
    const junior1 = { ...staffRow, id: "s-jr1", years_experience: 2, role: "junior" };
    const junior2 = { ...staffRow, id: "s-jr2", years_experience: 1, role: "junior" };
    const trial = { ...staffRow, id: "s-tr", years_experience: 0, role: "trial" };

    mockAutoAssignClient({
      session: { ...sessionRow, required_staff: 4 },
      staff: [lead, exp, junior1, junior2, trial],
      availability: [
        { ...availRow, staff_id: "s-lead", status: "available" },
        { ...availRow, staff_id: "s-exp", status: "available" },
        { ...availRow, staff_id: "s-jr1", status: "available" },
        { ...availRow, staff_id: "s-jr2", status: "available" },
        { ...availRow, staff_id: "s-tr", status: "available" },
      ],
      slots: [
        { ...slotRow, id: "slot-sess1-0", slot_index: 0 },
        { ...slotRow, id: "slot-sess1-1", slot_index: 1 },
        { ...slotRow, id: "slot-sess1-2", slot_index: 2 },
        { ...slotRow, id: "slot-sess1-3", slot_index: 3 },
      ],
    });

    const result = await autoAssignSession("sess1", "balanced");
    expect(result.assigned).toBe(4);

    const assignCalls = assignCallsFor();
    expect(assignCalls[0][1]).toEqual(["s-lead", "slot-sess1-0"]);
    expect(assignCalls[1][1]).toEqual(["s-exp", "slot-sess1-1"]);
    expect(assignCalls[2][1]).toEqual(["s-jr1", "slot-sess1-2"]);
    expect(assignCalls[3][1]).toEqual(["s-jr2", "slot-sess1-3"]);
  });

  it("expensive strategy picks 1 lead, 2 experience, then trials before juniors", async () => {
    const lead = { ...staffRow, id: "s-lead", years_experience: 8, role: "lead" };
    const exp1 = { ...staffRow, id: "s-exp1", years_experience: 6, role: "experience" };
    const exp2 = { ...staffRow, id: "s-exp2", years_experience: 4, role: "experience" };
    const junior = { ...staffRow, id: "s-jr", years_experience: 2, role: "junior" };
    const trial = { ...staffRow, id: "s-tr", years_experience: 0, role: "trial" };

    mockAutoAssignClient({
      session: { ...sessionRow, required_staff: 5 },
      staff: [lead, exp1, exp2, junior, trial],
      availability: [
        { ...availRow, staff_id: "s-lead", status: "available" },
        { ...availRow, staff_id: "s-exp1", status: "available" },
        { ...availRow, staff_id: "s-exp2", status: "available" },
        { ...availRow, staff_id: "s-jr", status: "available" },
        { ...availRow, staff_id: "s-tr", status: "available" },
      ],
      slots: [
        { ...slotRow, id: "slot-sess1-0", slot_index: 0 },
        { ...slotRow, id: "slot-sess1-1", slot_index: 1 },
        { ...slotRow, id: "slot-sess1-2", slot_index: 2 },
        { ...slotRow, id: "slot-sess1-3", slot_index: 3 },
        { ...slotRow, id: "slot-sess1-4", slot_index: 4 },
      ],
    });

    const result = await autoAssignSession("sess1", "expensive");
    expect(result.assigned).toBe(5);

    const assignCalls = assignCallsFor();
    expect(assignCalls[0][1]).toEqual(["s-lead", "slot-sess1-0"]);
    expect(assignCalls[1][1]).toEqual(["s-exp1", "slot-sess1-1"]);
    expect(assignCalls[2][1]).toEqual(["s-exp2", "slot-sess1-2"]);
    expect(assignCalls[3][1]).toEqual(["s-tr", "slot-sess1-3"]);
    expect(assignCalls[4][1]).toEqual(["s-jr", "slot-sess1-4"]);
  });

  it("respects existing role quotas when applying balanced strategy", async () => {
    // A lead is already manually assigned; balanced should not add another lead.
    const lead1 = { ...staffRow, id: "s-lead1", years_experience: 8, role: "lead" };
    const lead2 = { ...staffRow, id: "s-lead2", years_experience: 7, role: "lead" };
    const exp = { ...staffRow, id: "s-exp", years_experience: 5, role: "experience" };
    const junior = { ...staffRow, id: "s-jr", years_experience: 1, role: "junior" };

    mockAutoAssignClient({
      session: { ...sessionRow, required_staff: 3 },
      staff: [lead1, lead2, exp, junior],
      availability: [
        { ...availRow, staff_id: "s-lead2", status: "available" },
        { ...availRow, staff_id: "s-exp", status: "available" },
        { ...availRow, staff_id: "s-jr", status: "available" },
      ],
      slots: [
        {
          ...slotRow,
          id: "slot-sess1-0",
          slot_index: 0,
          assigned_staff_id: "s-lead1",
        },
        { ...slotRow, id: "slot-sess1-1", slot_index: 1 },
        { ...slotRow, id: "slot-sess1-2", slot_index: 2 },
      ],
    });

    const result = await autoAssignSession("sess1", "balanced");
    expect(result.assigned).toBe(2);

    const assignCalls = assignCallsFor();
    // Lead quota consumed by manual assignment; expect experience then junior.
    expect(assignCalls[0][1]).toEqual(["s-exp", "slot-sess1-1"]);
    expect(assignCalls[1][1]).toEqual(["s-jr", "slot-sess1-2"]);
  });

  it("rolls back on error during assignment", async () => {
    mockClientQuery
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockRejectedValueOnce(new Error("assign fail")); // session lock query fails

    await expect(autoAssignSession("sess1")).rejects.toThrow("assign fail");
    expect(mockClientQuery).toHaveBeenCalledWith("ROLLBACK");
    expect(mockClientRelease).toHaveBeenCalled();
  });
});

describe("isStaffDoubleBooked", () => {
  // sessionRow is 09:00-10:00 on 2025-06-15.
  it("returns true when staff is assigned to an overlapping same-day session", async () => {
    mockQuery
      // getSessionById
      .mockResolvedValueOnce({ rows: [sessionRow] })
      // this staff's same-day assignments (effective windows)
      .mockResolvedValueOnce({
        rows: [
          {
            session_start: "09:30",
            session_end: "10:30",
            assigned_start_time: null,
            assigned_end_time: null,
          },
        ],
      });

    const result = await isStaffDoubleBooked("sess1", "s1");
    expect(result).toBe(true);
  });

  it("returns false when the same-day session does not overlap in time", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [sessionRow] })
      // 10:00-11:00 touches but does not overlap 09:00-10:00
      .mockResolvedValueOnce({
        rows: [
          {
            session_start: "10:00",
            session_end: "11:00",
            assigned_start_time: null,
            assigned_end_time: null,
          },
        ],
      });

    const result = await isStaffDoubleBooked("sess1", "s1");
    expect(result).toBe(false);
    // getSessionById + one combined assignment query.
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });

  it("respects per-assignment adjusted times when checking overlap", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [sessionRow] })
      // Assigned to a 09:00-11:00 session but only works 10:00-11:00, so it no
      // longer overlaps the 09:00-10:00 target window.
      .mockResolvedValueOnce({
        rows: [
          {
            session_start: "09:00",
            session_end: "11:00",
            assigned_start_time: "10:00",
            assigned_end_time: "11:00",
          },
        ],
      });

    const result = await isStaffDoubleBooked("sess1", "s1");
    expect(result).toBe(false);
  });

  it("returns false when overlapping session has no assignment for that staff", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [sessionRow] })
      // No same-day assignments for this staff.
      .mockResolvedValueOnce({ rows: [] });

    const result = await isStaffDoubleBooked("sess1", "s1");
    expect(result).toBe(false);
  });

  it("returns false when the session does not exist", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await isStaffDoubleBooked("missing", "s1");
    expect(result).toBe(false);
  });
});
