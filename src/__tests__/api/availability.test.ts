import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  mockGetSession,
  mockGetAllAvailability,
  mockGetAvailabilityByStaff,
  mockUpsertAvailability,
  mockDeleteAvailability,
  mockGetStaffByUserId,
  mockBulkUpsertAvailability,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockGetAllAvailability: vi.fn(),
  mockGetAvailabilityByStaff: vi.fn(),
  mockUpsertAvailability: vi.fn(),
  mockDeleteAvailability: vi.fn(),
  mockGetStaffByUserId: vi.fn(),
  mockBulkUpsertAvailability: vi.fn(),
}));

vi.mock("@/lib/api-auth", () => ({
  getSession: mockGetSession,
  unauthorized: () => Response.json({ error: "Unauthorized" }, { status: 401 }),
  forbidden: () => Response.json({ error: "Forbidden" }, { status: 403 }),
  isAdmin: (s: { user: { role?: string | null } }) => s.user.role === "admin",
}));

vi.mock("@/lib/queries", () => ({
  getAllAvailability: mockGetAllAvailability,
  getAvailabilityByStaff: mockGetAvailabilityByStaff,
  upsertAvailability: mockUpsertAvailability,
  deleteAvailability: mockDeleteAvailability,
  getStaffByUserId: mockGetStaffByUserId,
  bulkUpsertAvailability: mockBulkUpsertAvailability,
}));

import { GET, POST, DELETE } from "@/app/api/availability/route";
import { POST as bulkPost } from "@/app/api/availability/bulk/route";

const adminSession = { user: { id: "u1", role: "admin" } };
const staffSession = { user: { id: "u2", role: "user" } };

const staffRecord = { id: "s2", userId: "u2", firstName: "Jane", lastName: "Doe", role: "junior", yearsExperience: 1 };

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ============ GET /api/availability ============

describe("GET /api/availability", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const req = makeRequest("/api/availability");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns all availability without staffId param", async () => {
    mockGetSession.mockResolvedValueOnce(staffSession);
    mockGetAllAvailability.mockResolvedValueOnce([{ staffId: "s1", sessionId: "sess1", status: "available" }]);
    const req = makeRequest("/api/availability");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(mockGetAllAvailability).toHaveBeenCalled();
  });

  it("filters by staffId when param provided", async () => {
    mockGetSession.mockResolvedValueOnce(staffSession);
    mockGetAvailabilityByStaff.mockResolvedValueOnce([]);
    const req = makeRequest("/api/availability?staffId=s1");
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(mockGetAvailabilityByStaff).toHaveBeenCalledWith("s1");
  });
});

// ============ POST /api/availability ============

describe("POST /api/availability", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const req = makeRequest("/api/availability", {
      method: "POST",
      body: JSON.stringify({ staffId: "s1", sessionId: "sess1", status: "available" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when missing required fields", async () => {
    mockGetSession.mockResolvedValueOnce(staffSession);
    const req = makeRequest("/api/availability", {
      method: "POST",
      body: JSON.stringify({ staffId: "s1" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("allows staff to set own availability", async () => {
    mockGetSession.mockResolvedValueOnce(staffSession);
    mockGetStaffByUserId.mockResolvedValueOnce(staffRecord);
    mockUpsertAvailability.mockResolvedValueOnce(undefined);
    const req = makeRequest("/api/availability", {
      method: "POST",
      body: JSON.stringify({ staffId: "s2", sessionId: "sess1", status: "available" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockUpsertAvailability).toHaveBeenCalled();
  });

  it("returns 403 when staff tries to set another's availability", async () => {
    mockGetSession.mockResolvedValueOnce(staffSession);
    mockGetStaffByUserId.mockResolvedValueOnce(staffRecord);
    const req = makeRequest("/api/availability", {
      method: "POST",
      body: JSON.stringify({ staffId: "s1", sessionId: "sess1", status: "available" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("allows admin to set any staff availability", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    mockGetStaffByUserId.mockResolvedValueOnce({ id: "s-admin", userId: "u1" });
    mockUpsertAvailability.mockResolvedValueOnce(undefined);
    const req = makeRequest("/api/availability", {
      method: "POST",
      body: JSON.stringify({ staffId: "s1", sessionId: "sess1", status: "available" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});

// ============ DELETE /api/availability ============

describe("DELETE /api/availability", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const req = makeRequest("/api/availability?staffId=s1&sessionId=sess1", { method: "DELETE" });
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when missing params", async () => {
    mockGetSession.mockResolvedValueOnce(staffSession);
    const req = makeRequest("/api/availability?staffId=s1", { method: "DELETE" });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  it("returns 403 when staff tries to delete another's availability", async () => {
    mockGetSession.mockResolvedValueOnce(staffSession);
    mockGetStaffByUserId.mockResolvedValueOnce(staffRecord);
    const req = makeRequest("/api/availability?staffId=s1&sessionId=sess1", { method: "DELETE" });
    const res = await DELETE(req);
    expect(res.status).toBe(403);
  });

  it("allows staff to delete own availability", async () => {
    mockGetSession.mockResolvedValueOnce(staffSession);
    mockGetStaffByUserId.mockResolvedValueOnce(staffRecord);
    mockDeleteAvailability.mockResolvedValueOnce(true);
    const req = makeRequest("/api/availability?staffId=s2&sessionId=sess1", { method: "DELETE" });
    const res = await DELETE(req);
    expect(res.status).toBe(200);
  });

  it("allows admin to delete any availability", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    mockGetStaffByUserId.mockResolvedValueOnce({ id: "s-admin" });
    mockDeleteAvailability.mockResolvedValueOnce(true);
    const req = makeRequest("/api/availability?staffId=s1&sessionId=sess1", { method: "DELETE" });
    const res = await DELETE(req);
    expect(res.status).toBe(200);
  });
});

// ============ POST /api/availability/bulk ============

describe("POST /api/availability/bulk", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const req = makeRequest("/api/availability/bulk", {
      method: "POST",
      body: JSON.stringify({ entries: [] }),
    });
    const res = await bulkPost(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for empty entries", async () => {
    mockGetSession.mockResolvedValueOnce(staffSession);
    const req = makeRequest("/api/availability/bulk", {
      method: "POST",
      body: JSON.stringify({ entries: [] }),
    });
    const res = await bulkPost(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing entries field", async () => {
    mockGetSession.mockResolvedValueOnce(staffSession);
    const req = makeRequest("/api/availability/bulk", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await bulkPost(req);
    expect(res.status).toBe(400);
  });

  it("allows staff to bulk upsert own availability", async () => {
    mockGetSession.mockResolvedValueOnce(staffSession);
    mockGetStaffByUserId.mockResolvedValueOnce(staffRecord);
    mockBulkUpsertAvailability.mockResolvedValueOnce(undefined);
    const req = makeRequest("/api/availability/bulk", {
      method: "POST",
      body: JSON.stringify({
        entries: [
          { staffId: "s2", sessionId: "sess1", status: "available" },
          { staffId: "s2", sessionId: "sess2", status: "maybe" },
        ],
      }),
    });
    const res = await bulkPost(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBe(2);
  });

  it("returns 403 when staff includes another staff's entry", async () => {
    mockGetSession.mockResolvedValueOnce(staffSession);
    mockGetStaffByUserId.mockResolvedValueOnce(staffRecord);
    const req = makeRequest("/api/availability/bulk", {
      method: "POST",
      body: JSON.stringify({
        entries: [
          { staffId: "s2", sessionId: "sess1", status: "available" },
          { staffId: "s1", sessionId: "sess2", status: "available" },
        ],
      }),
    });
    const res = await bulkPost(req);
    expect(res.status).toBe(403);
  });

  it("allows admin to bulk upsert for any staff", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    mockGetStaffByUserId.mockResolvedValueOnce({ id: "s-admin" });
    mockBulkUpsertAvailability.mockResolvedValueOnce(undefined);
    const req = makeRequest("/api/availability/bulk", {
      method: "POST",
      body: JSON.stringify({
        entries: [
          { staffId: "s1", sessionId: "sess1", status: "available" },
          { staffId: "s2", sessionId: "sess2", status: "maybe" },
        ],
      }),
    });
    const res = await bulkPost(req);
    expect(res.status).toBe(200);
  });
});
