import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockGetSession, mockGetAllStaff, mockCreateStaff, mockGetStaffById, mockUpdateStaff, mockDeleteStaff, mockGetStaffByUserId } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockGetAllStaff: vi.fn(),
  mockCreateStaff: vi.fn(),
  mockGetStaffById: vi.fn(),
  mockUpdateStaff: vi.fn(),
  mockDeleteStaff: vi.fn(),
  mockGetStaffByUserId: vi.fn(),
}));

vi.mock("@/lib/api-auth", () => ({
  getSession: mockGetSession,
  unauthorized: () => Response.json({ error: "Unauthorized" }, { status: 401 }),
  forbidden: () => Response.json({ error: "Forbidden" }, { status: 403 }),
  isAdmin: (s: { user: { role?: string | null } }) => s.user.role === "admin",
}));

vi.mock("@/lib/queries", () => ({
  getAllStaff: mockGetAllStaff,
  createStaff: mockCreateStaff,
  getStaffById: mockGetStaffById,
  updateStaff: mockUpdateStaff,
  deleteStaff: mockDeleteStaff,
  getStaffByUserId: mockGetStaffByUserId,
}));

import { GET as listStaff, POST as createStaffRoute } from "@/app/api/staff/route";
import { GET as getStaffByIdRoute, PATCH as patchStaff, DELETE as deleteStaffRoute } from "@/app/api/staff/[id]/route";
import { GET as getMe } from "@/app/api/staff/me/route";

const adminSession = { user: { id: "u1", role: "admin" } };
const staffSession = { user: { id: "u2", role: "user" } };

const sampleStaff = {
  id: "s1",
  userId: "u1",
  firstName: "John",
  lastName: "Doe",
  role: "head-coach",
  yearsExperience: 5,
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

// ============ GET /api/staff ============

describe("GET /api/staff", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await listStaff();
    expect(res.status).toBe(401);
  });

  it("returns staff list when authenticated", async () => {
    mockGetSession.mockResolvedValueOnce(staffSession);
    mockGetAllStaff.mockResolvedValueOnce([sampleStaff]);
    const res = await listStaff();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([sampleStaff]);
  });
});

// ============ POST /api/staff ============

describe("POST /api/staff", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const req = makeRequest("http://localhost:3000/api/staff", {
      method: "POST",
      body: JSON.stringify(sampleStaff),
    });
    const res = await createStaffRoute(req);
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin", async () => {
    mockGetSession.mockResolvedValueOnce(staffSession);
    const req = makeRequest("http://localhost:3000/api/staff", {
      method: "POST",
      body: JSON.stringify(sampleStaff),
    });
    const res = await createStaffRoute(req);
    expect(res.status).toBe(403);
  });

  it("returns 400 when missing required fields", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    const req = makeRequest("http://localhost:3000/api/staff", {
      method: "POST",
      body: JSON.stringify({ id: "s1" }),
    });
    const res = await createStaffRoute(req);
    expect(res.status).toBe(400);
  });

  it("creates staff and returns 201", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    mockCreateStaff.mockResolvedValueOnce(sampleStaff);
    const req = makeRequest("http://localhost:3000/api/staff", {
      method: "POST",
      body: JSON.stringify(sampleStaff),
    });
    const res = await createStaffRoute(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe("s1");
  });
});

// ============ GET /api/staff/[id] ============

describe("GET /api/staff/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const req = makeRequest("http://localhost:3000/api/staff/s1");
    const res = await getStaffByIdRoute(req, makeParams("s1"));
    expect(res.status).toBe(401);
  });

  it("returns 404 when staff not found", async () => {
    mockGetSession.mockResolvedValueOnce(staffSession);
    mockGetStaffById.mockResolvedValueOnce(null);
    const req = makeRequest("http://localhost:3000/api/staff/missing");
    const res = await getStaffByIdRoute(req, makeParams("missing"));
    expect(res.status).toBe(404);
  });

  it("returns staff when found", async () => {
    mockGetSession.mockResolvedValueOnce(staffSession);
    mockGetStaffById.mockResolvedValueOnce(sampleStaff);
    const req = makeRequest("http://localhost:3000/api/staff/s1");
    const res = await getStaffByIdRoute(req, makeParams("s1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("s1");
  });
});

// ============ PATCH /api/staff/[id] ============

describe("PATCH /api/staff/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const req = makeRequest("http://localhost:3000/api/staff/s1", {
      method: "PATCH",
      body: JSON.stringify({ firstName: "Jane" }),
    });
    const res = await patchStaff(req, makeParams("s1"));
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin", async () => {
    mockGetSession.mockResolvedValueOnce(staffSession);
    const req = makeRequest("http://localhost:3000/api/staff/s1", {
      method: "PATCH",
      body: JSON.stringify({ firstName: "Jane" }),
    });
    const res = await patchStaff(req, makeParams("s1"));
    expect(res.status).toBe(403);
  });

  it("returns 404 when staff not found", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    mockUpdateStaff.mockResolvedValueOnce(null);
    const req = makeRequest("http://localhost:3000/api/staff/missing", {
      method: "PATCH",
      body: JSON.stringify({ firstName: "Jane" }),
    });
    const res = await patchStaff(req, makeParams("missing"));
    expect(res.status).toBe(404);
  });

  it("updates and returns staff", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    mockUpdateStaff.mockResolvedValueOnce({ ...sampleStaff, firstName: "Jane" });
    const req = makeRequest("http://localhost:3000/api/staff/s1", {
      method: "PATCH",
      body: JSON.stringify({ firstName: "Jane" }),
    });
    const res = await patchStaff(req, makeParams("s1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.firstName).toBe("Jane");
  });
});

// ============ DELETE /api/staff/[id] ============

describe("DELETE /api/staff/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const req = makeRequest("http://localhost:3000/api/staff/s1", { method: "DELETE" });
    const res = await deleteStaffRoute(req, makeParams("s1"));
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin", async () => {
    mockGetSession.mockResolvedValueOnce(staffSession);
    const req = makeRequest("http://localhost:3000/api/staff/s1", { method: "DELETE" });
    const res = await deleteStaffRoute(req, makeParams("s1"));
    expect(res.status).toBe(403);
  });

  it("returns 404 when staff not found", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    mockDeleteStaff.mockResolvedValueOnce(false);
    const req = makeRequest("http://localhost:3000/api/staff/missing", { method: "DELETE" });
    const res = await deleteStaffRoute(req, makeParams("missing"));
    expect(res.status).toBe(404);
  });

  it("deletes staff and returns success", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    mockDeleteStaff.mockResolvedValueOnce(true);
    const req = makeRequest("http://localhost:3000/api/staff/s1", { method: "DELETE" });
    const res = await deleteStaffRoute(req, makeParams("s1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

// ============ GET /api/staff/me ============

describe("GET /api/staff/me", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await getMe();
    expect(res.status).toBe(401);
  });

  it("returns null when no linked staff", async () => {
    mockGetSession.mockResolvedValueOnce(staffSession);
    mockGetStaffByUserId.mockResolvedValueOnce(null);
    const res = await getMe();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toBeNull();
  });

  it("returns staff for current user", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    mockGetStaffByUserId.mockResolvedValueOnce(sampleStaff);
    const res = await getMe();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("s1");
  });
});
