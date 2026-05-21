import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  mockGetSession,
  mockGetAllSchedules,
  mockCreateSchedule,
  mockGetScheduleById,
  mockUpdateSchedule,
  mockDeleteSchedule,
  mockGetSessionsByScheduleId,
  mockCreateSessions,
  mockGetSessionById,
  mockUpdateSession,
  mockDeleteSession,
  mockAutoAssignSession,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockGetAllSchedules: vi.fn(),
  mockCreateSchedule: vi.fn(),
  mockGetScheduleById: vi.fn(),
  mockUpdateSchedule: vi.fn(),
  mockDeleteSchedule: vi.fn(),
  mockGetSessionsByScheduleId: vi.fn(),
  mockCreateSessions: vi.fn(),
  mockGetSessionById: vi.fn(),
  mockUpdateSession: vi.fn(),
  mockDeleteSession: vi.fn(),
  mockAutoAssignSession: vi.fn(),
}));

vi.mock("@/lib/api-auth", () => ({
  getSession: mockGetSession,
  unauthorized: () => Response.json({ error: "Unauthorized" }, { status: 401 }),
  forbidden: () => Response.json({ error: "Forbidden" }, { status: 403 }),
  isAdmin: (s: { user: { role?: string | null } }) => s.user.role === "admin",
}));

vi.mock("@/lib/queries", () => ({
  getAllSchedules: mockGetAllSchedules,
  createSchedule: mockCreateSchedule,
  getScheduleById: mockGetScheduleById,
  updateSchedule: mockUpdateSchedule,
  deleteSchedule: mockDeleteSchedule,
  getSessionsByScheduleId: mockGetSessionsByScheduleId,
  createSessions: mockCreateSessions,
  getSessionById: mockGetSessionById,
  updateSession: mockUpdateSession,
  deleteSession: mockDeleteSession,
  autoAssignSession: mockAutoAssignSession,
}));

import { GET as listSchedules, POST as createScheduleRoute } from "@/app/api/schedules/route";
import { GET as getSchedule, PATCH as patchSchedule, DELETE as deleteScheduleRoute } from "@/app/api/schedules/[id]/route";
import { GET as listSessions, POST as createSessionsRoute } from "@/app/api/schedules/[id]/sessions/route";
import { GET as getSession, PATCH as patchSession, DELETE as deleteSessionRoute } from "@/app/api/sessions/[id]/route";
import { POST as autoAssignSessionRoute } from "@/app/api/sessions/[id]/auto-assign/route";

const adminSession = { user: { id: "u1", role: "admin" } };
const staffSession = { user: { id: "u2", role: "user" } };

const sampleSchedule = {
  id: "sch1",
  name: "Summer",
  description: "Summer program",
  startDate: "2025-06-01",
  endDate: "2025-08-31",
  sessions: [],
};

const sampleSession = {
  id: "sess1",
  scheduleId: "sch1",
  date: "2025-06-15",
  dayOfWeek: "Monday",
  startTime: "09:00",
  endTime: "10:00",
  location: "Field A",
  requiredStaff: 2,
};

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ============ GET /api/schedules ============

describe("GET /api/schedules", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await listSchedules();
    expect(res.status).toBe(401);
  });

  it("returns schedules list", async () => {
    mockGetSession.mockResolvedValueOnce(staffSession);
    mockGetAllSchedules.mockResolvedValueOnce([sampleSchedule]);
    const res = await listSchedules();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
  });
});

// ============ POST /api/schedules ============

describe("POST /api/schedules", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const req = makeRequest("/api/schedules", {
      method: "POST",
      body: JSON.stringify(sampleSchedule),
    });
    const res = await createScheduleRoute(req);
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin", async () => {
    mockGetSession.mockResolvedValueOnce(staffSession);
    const req = makeRequest("/api/schedules", {
      method: "POST",
      body: JSON.stringify(sampleSchedule),
    });
    const res = await createScheduleRoute(req);
    expect(res.status).toBe(403);
  });

  it("returns 400 for missing fields", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    const req = makeRequest("/api/schedules", {
      method: "POST",
      body: JSON.stringify({ id: "sch1" }),
    });
    const res = await createScheduleRoute(req);
    expect(res.status).toBe(400);
  });

  it("creates schedule and returns 201", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    mockCreateSchedule.mockResolvedValueOnce(sampleSchedule);
    const req = makeRequest("/api/schedules", {
      method: "POST",
      body: JSON.stringify(sampleSchedule),
    });
    const res = await createScheduleRoute(req);
    expect(res.status).toBe(201);
  });
});

// ============ GET /api/schedules/[id] ============

describe("GET /api/schedules/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const req = makeRequest("/api/schedules/sch1");
    const res = await getSchedule(req, makeParams("sch1"));
    expect(res.status).toBe(401);
  });

  it("returns 404 when not found", async () => {
    mockGetSession.mockResolvedValueOnce(staffSession);
    mockGetScheduleById.mockResolvedValueOnce(null);
    const req = makeRequest("/api/schedules/missing");
    const res = await getSchedule(req, makeParams("missing"));
    expect(res.status).toBe(404);
  });

  it("returns schedule when found", async () => {
    mockGetSession.mockResolvedValueOnce(staffSession);
    mockGetScheduleById.mockResolvedValueOnce(sampleSchedule);
    const req = makeRequest("/api/schedules/sch1");
    const res = await getSchedule(req, makeParams("sch1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("sch1");
  });
});

// ============ PATCH /api/schedules/[id] ============

describe("PATCH /api/schedules/[id]", () => {
  it("returns 403 for non-admin", async () => {
    mockGetSession.mockResolvedValueOnce(staffSession);
    const req = makeRequest("/api/schedules/sch1", {
      method: "PATCH",
      body: JSON.stringify({ name: "Winter" }),
    });
    const res = await patchSchedule(req, makeParams("sch1"));
    expect(res.status).toBe(403);
  });

  it("returns 404 when update fails", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    mockUpdateSchedule.mockResolvedValueOnce(false);
    const req = makeRequest("/api/schedules/missing", {
      method: "PATCH",
      body: JSON.stringify({ name: "Winter" }),
    });
    const res = await patchSchedule(req, makeParams("missing"));
    expect(res.status).toBe(404);
  });

  it("updates and returns schedule", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    mockUpdateSchedule.mockResolvedValueOnce(true);
    mockGetScheduleById.mockResolvedValueOnce({ ...sampleSchedule, name: "Winter" });
    const req = makeRequest("/api/schedules/sch1", {
      method: "PATCH",
      body: JSON.stringify({ name: "Winter" }),
    });
    const res = await patchSchedule(req, makeParams("sch1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Winter");
  });
});

// ============ DELETE /api/schedules/[id] ============

describe("DELETE /api/schedules/[id]", () => {
  it("returns 403 for non-admin", async () => {
    mockGetSession.mockResolvedValueOnce(staffSession);
    const req = makeRequest("/api/schedules/sch1", { method: "DELETE" });
    const res = await deleteScheduleRoute(req, makeParams("sch1"));
    expect(res.status).toBe(403);
  });

  it("returns 404 when not found", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    mockDeleteSchedule.mockResolvedValueOnce(false);
    const req = makeRequest("/api/schedules/missing", { method: "DELETE" });
    const res = await deleteScheduleRoute(req, makeParams("missing"));
    expect(res.status).toBe(404);
  });

  it("deletes and returns success", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    mockDeleteSchedule.mockResolvedValueOnce(true);
    const req = makeRequest("/api/schedules/sch1", { method: "DELETE" });
    const res = await deleteScheduleRoute(req, makeParams("sch1"));
    expect(res.status).toBe(200);
  });
});

// ============ GET /api/schedules/[id]/sessions ============

describe("GET /api/schedules/[id]/sessions", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const req = makeRequest("/api/schedules/sch1/sessions");
    const res = await listSessions(req, makeParams("sch1"));
    expect(res.status).toBe(401);
  });

  it("returns sessions for schedule", async () => {
    mockGetSession.mockResolvedValueOnce(staffSession);
    mockGetSessionsByScheduleId.mockResolvedValueOnce([sampleSession]);
    const req = makeRequest("/api/schedules/sch1/sessions");
    const res = await listSessions(req, makeParams("sch1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
  });
});

// ============ POST /api/schedules/[id]/sessions ============

describe("POST /api/schedules/[id]/sessions", () => {
  it("returns 403 for non-admin", async () => {
    mockGetSession.mockResolvedValueOnce(staffSession);
    const req = makeRequest("/api/schedules/sch1/sessions", {
      method: "POST",
      body: JSON.stringify({ sessions: [sampleSession] }),
    });
    const res = await createSessionsRoute(req, makeParams("sch1"));
    expect(res.status).toBe(403);
  });

  it("returns 400 for empty sessions array", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    const req = makeRequest("/api/schedules/sch1/sessions", {
      method: "POST",
      body: JSON.stringify({ sessions: [] }),
    });
    const res = await createSessionsRoute(req, makeParams("sch1"));
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing sessions field", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    const req = makeRequest("/api/schedules/sch1/sessions", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await createSessionsRoute(req, makeParams("sch1"));
    expect(res.status).toBe(400);
  });

  it("creates sessions and returns 201", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    mockCreateSessions.mockResolvedValueOnce(undefined);
    const req = makeRequest("/api/schedules/sch1/sessions", {
      method: "POST",
      body: JSON.stringify({ sessions: [sampleSession] }),
    });
    const res = await createSessionsRoute(req, makeParams("sch1"));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.count).toBe(1);
  });
});

// ============ GET /api/sessions/[id] ============

describe("GET /api/sessions/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const req = makeRequest("/api/sessions/sess1");
    const res = await getSession(req, makeParams("sess1"));
    expect(res.status).toBe(401);
  });

  it("returns 404 when not found", async () => {
    mockGetSession.mockResolvedValueOnce(staffSession);
    mockGetSessionById.mockResolvedValueOnce(null);
    const req = makeRequest("/api/sessions/missing");
    const res = await getSession(req, makeParams("missing"));
    expect(res.status).toBe(404);
  });

  it("returns session when found", async () => {
    mockGetSession.mockResolvedValueOnce(staffSession);
    mockGetSessionById.mockResolvedValueOnce(sampleSession);
    const req = makeRequest("/api/sessions/sess1");
    const res = await getSession(req, makeParams("sess1"));
    expect(res.status).toBe(200);
  });
});

// ============ PATCH /api/sessions/[id] ============

describe("PATCH /api/sessions/[id]", () => {
  it("returns 403 for non-admin", async () => {
    mockGetSession.mockResolvedValueOnce(staffSession);
    const req = makeRequest("/api/sessions/sess1", {
      method: "PATCH",
      body: JSON.stringify({ location: "Field B" }),
    });
    const res = await patchSession(req, makeParams("sess1"));
    expect(res.status).toBe(403);
  });

  it("returns 404 when update fails", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    mockUpdateSession.mockResolvedValueOnce(false);
    const req = makeRequest("/api/sessions/missing", {
      method: "PATCH",
      body: JSON.stringify({ location: "Field B" }),
    });
    const res = await patchSession(req, makeParams("missing"));
    expect(res.status).toBe(404);
  });

  it("updates and returns session", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    mockUpdateSession.mockResolvedValueOnce(true);
    mockGetSessionById.mockResolvedValueOnce({ ...sampleSession, location: "Field B" });
    const req = makeRequest("/api/sessions/sess1", {
      method: "PATCH",
      body: JSON.stringify({ location: "Field B" }),
    });
    const res = await patchSession(req, makeParams("sess1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.location).toBe("Field B");
  });
});

// ============ DELETE /api/sessions/[id] ============

describe("DELETE /api/sessions/[id]", () => {
  it("returns 403 for non-admin", async () => {
    mockGetSession.mockResolvedValueOnce(staffSession);
    const req = makeRequest("/api/sessions/sess1", { method: "DELETE" });
    const res = await deleteSessionRoute(req, makeParams("sess1"));
    expect(res.status).toBe(403);
  });

  it("returns 404 when not found", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    mockDeleteSession.mockResolvedValueOnce(false);
    const req = makeRequest("/api/sessions/missing", { method: "DELETE" });
    const res = await deleteSessionRoute(req, makeParams("missing"));
    expect(res.status).toBe(404);
  });

  it("deletes and returns success", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    mockDeleteSession.mockResolvedValueOnce(true);
    const req = makeRequest("/api/sessions/sess1", { method: "DELETE" });
    const res = await deleteSessionRoute(req, makeParams("sess1"));
    expect(res.status).toBe(200);
  });
});

// ============ POST /api/sessions/[id]/auto-assign ============

describe("POST /api/sessions/[id]/auto-assign", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const req = makeRequest("/api/sessions/sess1/auto-assign", { method: "POST" });
    const res = await autoAssignSessionRoute(req, makeParams("sess1"));
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin", async () => {
    mockGetSession.mockResolvedValueOnce(staffSession);
    const req = makeRequest("/api/sessions/sess1/auto-assign", { method: "POST" });
    const res = await autoAssignSessionRoute(req, makeParams("sess1"));
    expect(res.status).toBe(403);
  });

  it("runs auto-assign and returns result", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    mockAutoAssignSession.mockResolvedValueOnce({ assigned: 2, empty: 0, conflicts: [] });
    const req = makeRequest("/api/sessions/sess1/auto-assign", { method: "POST" });
    const res = await autoAssignSessionRoute(req, makeParams("sess1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.assigned).toBe(2);
    expect(mockAutoAssignSession).toHaveBeenCalledWith("sess1");
  });
});
