import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  mockGetSession,
  mockGetSlotsForSession,
  mockGetAllSlots,
  mockInitializeSlotsForSession,
  mockAssignStaffToSlot,
  mockUnassignSlot,
  mockIsStaffDoubleBooked,
  mockPoolQuery,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockGetSlotsForSession: vi.fn(),
  mockGetAllSlots: vi.fn(),
  mockInitializeSlotsForSession: vi.fn(),
  mockAssignStaffToSlot: vi.fn(),
  mockUnassignSlot: vi.fn(),
  mockIsStaffDoubleBooked: vi.fn(),
  mockPoolQuery: vi.fn(),
}));

vi.mock("@/lib/api-auth", () => ({
  getSession: mockGetSession,
  unauthorized: () => Response.json({ error: "Unauthorized" }, { status: 401 }),
  forbidden: () => Response.json({ error: "Forbidden" }, { status: 403 }),
  isAdmin: (s: { user: { role?: string | null } }) => s.user.role === "admin",
}));

vi.mock("@/lib/queries", () => ({
  getSlotsForSession: mockGetSlotsForSession,
  getAllSlots: mockGetAllSlots,
  initializeSlotsForSession: mockInitializeSlotsForSession,
  assignStaffToSlot: mockAssignStaffToSlot,
  unassignSlot: mockUnassignSlot,
  isStaffDoubleBooked: mockIsStaffDoubleBooked,
}));

vi.mock("@/lib/db", () => ({
  default: { query: mockPoolQuery },
}));

import { GET as getSessionSlots, POST as initSlots, PATCH as patchSlot } from "@/app/api/sessions/[id]/slots/route";
import { GET as getAllSlotsRoute } from "@/app/api/slots/route";

const adminSession = { user: { id: "u1", role: "admin" } };
const staffSession = { user: { id: "u2", role: "user" } };

const sampleSlot = { id: "slot-sess1-0", sessionId: "sess1", slotIndex: 0 };

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ============ GET /api/slots ============

describe("GET /api/slots", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await getAllSlotsRoute();
    expect(res.status).toBe(401);
  });

  it("returns all slots", async () => {
    mockGetSession.mockResolvedValueOnce(staffSession);
    mockGetAllSlots.mockResolvedValueOnce([sampleSlot]);
    const res = await getAllSlotsRoute();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
  });
});

// ============ GET /api/sessions/[id]/slots ============

describe("GET /api/sessions/[id]/slots", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const req = makeRequest("/api/sessions/sess1/slots");
    const res = await getSessionSlots(req, makeParams("sess1"));
    expect(res.status).toBe(401);
  });

  it("returns slots for session", async () => {
    mockGetSession.mockResolvedValueOnce(staffSession);
    mockGetSlotsForSession.mockResolvedValueOnce([sampleSlot]);
    const req = makeRequest("/api/sessions/sess1/slots");
    const res = await getSessionSlots(req, makeParams("sess1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
  });
});

// ============ POST /api/sessions/[id]/slots ============

describe("POST /api/sessions/[id]/slots", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const req = makeRequest("/api/sessions/sess1/slots", {
      method: "POST",
      body: JSON.stringify({ count: 3 }),
    });
    const res = await initSlots(req, makeParams("sess1"));
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin", async () => {
    mockGetSession.mockResolvedValueOnce(staffSession);
    const req = makeRequest("/api/sessions/sess1/slots", {
      method: "POST",
      body: JSON.stringify({ count: 3 }),
    });
    const res = await initSlots(req, makeParams("sess1"));
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid count", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    const req = makeRequest("/api/sessions/sess1/slots", {
      method: "POST",
      body: JSON.stringify({ count: "abc" }),
    });
    const res = await initSlots(req, makeParams("sess1"));
    expect(res.status).toBe(400);
  });

  it("returns 400 for negative count", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    const req = makeRequest("/api/sessions/sess1/slots", {
      method: "POST",
      body: JSON.stringify({ count: -1 }),
    });
    const res = await initSlots(req, makeParams("sess1"));
    expect(res.status).toBe(400);
  });

  it("initializes slots and returns them", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    mockInitializeSlotsForSession.mockResolvedValueOnce([sampleSlot, { ...sampleSlot, id: "slot-sess1-1", slotIndex: 1 }]);
    const req = makeRequest("/api/sessions/sess1/slots", {
      method: "POST",
      body: JSON.stringify({ count: 2 }),
    });
    const res = await initSlots(req, makeParams("sess1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
  });
});

// ============ PATCH /api/sessions/[id]/slots ============

describe("PATCH /api/sessions/[id]/slots", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const req = makeRequest("/api/sessions/sess1/slots", {
      method: "PATCH",
      body: JSON.stringify({ slotId: "slot1", staffId: "s1" }),
    });
    const res = await patchSlot(req, makeParams("sess1"));
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin", async () => {
    mockGetSession.mockResolvedValueOnce(staffSession);
    const req = makeRequest("/api/sessions/sess1/slots", {
      method: "PATCH",
      body: JSON.stringify({ slotId: "slot1", staffId: "s1" }),
    });
    const res = await patchSlot(req, makeParams("sess1"));
    expect(res.status).toBe(403);
  });

  it("returns 400 when slotId missing", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    const req = makeRequest("/api/sessions/sess1/slots", {
      method: "PATCH",
      body: JSON.stringify({ staffId: "s1" }),
    });
    const res = await patchSlot(req, makeParams("sess1"));
    expect(res.status).toBe(400);
  });

  it("returns 404 when slot not found", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    mockPoolQuery.mockResolvedValueOnce({ rows: [] });
    const req = makeRequest("/api/sessions/sess1/slots", {
      method: "PATCH",
      body: JSON.stringify({ slotId: "slot1", staffId: "s1" }),
    });
    const res = await patchSlot(req, makeParams("sess1"));
    expect(res.status).toBe(404);
  });

  it("returns 400 when neither staffId nor unassign action", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    mockPoolQuery.mockResolvedValueOnce({ rows: [{ session_id: "sess1" }] });
    const req = makeRequest("/api/sessions/sess1/slots", {
      method: "PATCH",
      body: JSON.stringify({ slotId: "slot1" }),
    });
    const res = await patchSlot(req, makeParams("sess1"));
    expect(res.status).toBe(400);
  });

  it("assigns staff to slot", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    mockPoolQuery.mockResolvedValueOnce({ rows: [{ session_id: "sess1" }] });
    mockIsStaffDoubleBooked.mockResolvedValueOnce(false);
    mockAssignStaffToSlot.mockResolvedValueOnce(true);
    const req = makeRequest("/api/sessions/sess1/slots", {
      method: "PATCH",
      body: JSON.stringify({ slotId: "slot1", staffId: "s1" }),
    });
    const res = await patchSlot(req, makeParams("sess1"));
    expect(res.status).toBe(200);
    expect(mockAssignStaffToSlot).toHaveBeenCalledWith("slot1", "s1");
  });

  it("unassigns slot", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    mockPoolQuery.mockResolvedValueOnce({ rows: [{ session_id: "sess1" }] });
    mockUnassignSlot.mockResolvedValueOnce(true);
    const req = makeRequest("/api/sessions/sess1/slots", {
      method: "PATCH",
      body: JSON.stringify({ slotId: "slot1", action: "unassign" }),
    });
    const res = await patchSlot(req, makeParams("sess1"));
    expect(res.status).toBe(200);
    expect(mockUnassignSlot).toHaveBeenCalledWith("slot1");
  });
});
