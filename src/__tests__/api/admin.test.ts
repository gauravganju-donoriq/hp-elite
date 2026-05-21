import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  mockGetSession,
  mockCreateStaff,
  mockGetStaffById,
  mockUpdateStaff,
  mockCreateUser,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockCreateStaff: vi.fn(),
  mockGetStaffById: vi.fn(),
  mockUpdateStaff: vi.fn(),
  mockCreateUser: vi.fn(),
}));

vi.mock("@/lib/api-auth", () => ({
  getSession: mockGetSession,
  unauthorized: () => Response.json({ error: "Unauthorized" }, { status: 401 }),
  forbidden: () => Response.json({ error: "Forbidden" }, { status: 403 }),
  isAdmin: (s: { user: { role?: string | null } }) => s.user.role === "admin",
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      createUser: mockCreateUser,
    },
  },
}));

vi.mock("@/lib/queries", () => ({
  createStaff: mockCreateStaff,
  getStaffById: mockGetStaffById,
  updateStaff: mockUpdateStaff,
}));

import { POST as createUserRoute } from "@/app/api/admin/create-user/route";
import { POST as linkAccountRoute } from "@/app/api/admin/link-account/route";

const adminSession = { user: { id: "u1", role: "admin" } };
const staffSession = { user: { id: "u2", role: "user" } };

function makeRequest(url: string, body: object) {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ============ POST /api/admin/create-user ============

describe("POST /api/admin/create-user", () => {
  const validBody = {
    email: "john@example.com",
    password: "password123",
    firstName: "John",
    lastName: "Doe",
    staffRole: "lead",
  };

  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const req = makeRequest("/api/admin/create-user", validBody);
    const res = await createUserRoute(req);
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin", async () => {
    mockGetSession.mockResolvedValueOnce(staffSession);
    const req = makeRequest("/api/admin/create-user", validBody);
    const res = await createUserRoute(req);
    expect(res.status).toBe(403);
  });

  it("returns 400 when missing required fields", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    const req = makeRequest("/api/admin/create-user", { email: "john@example.com" });
    const res = await createUserRoute(req);
    expect(res.status).toBe(400);
  });

  it("returns 500 when auth.api.createUser returns null", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    mockCreateUser.mockResolvedValueOnce(null);
    const req = makeRequest("/api/admin/create-user", validBody);
    const res = await createUserRoute(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("Failed to create auth user");
  });

  it("creates user and staff, returns 201", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    mockCreateUser.mockResolvedValueOnce({ user: { id: "new-user-id" } });
    mockCreateStaff.mockResolvedValueOnce({
      id: "s-123",
      userId: "new-user-id",
      firstName: "John",
      lastName: "Doe",
      role: "lead",
      yearsExperience: 0,
    });
    const req = makeRequest("/api/admin/create-user", validBody);
    const res = await createUserRoute(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.userId).toBe("new-user-id");
    expect(mockCreateStaff).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "new-user-id",
        firstName: "John",
        lastName: "Doe",
        role: "lead",
      })
    );
  });

  it("returns 500 when auth throws", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    mockCreateUser.mockRejectedValueOnce(new Error("Email already exists"));
    const req = makeRequest("/api/admin/create-user", validBody);
    const res = await createUserRoute(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Email already exists");
  });
});

// ============ POST /api/admin/link-account ============

describe("POST /api/admin/link-account", () => {
  const validBody = {
    staffId: "s1",
    email: "jane@example.com",
    password: "password123",
  };

  const existingStaff = {
    id: "s1",
    userId: undefined,
    firstName: "Jane",
    lastName: "Doe",
    role: "junior",
    yearsExperience: 1,
  };

  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const req = makeRequest("/api/admin/link-account", validBody);
    const res = await linkAccountRoute(req);
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin", async () => {
    mockGetSession.mockResolvedValueOnce(staffSession);
    const req = makeRequest("/api/admin/link-account", validBody);
    const res = await linkAccountRoute(req);
    expect(res.status).toBe(403);
  });

  it("returns 400 when missing required fields", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    const req = makeRequest("/api/admin/link-account", { staffId: "s1" });
    const res = await linkAccountRoute(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 when staff not found", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    mockGetStaffById.mockResolvedValueOnce(null);
    const req = makeRequest("/api/admin/link-account", validBody);
    const res = await linkAccountRoute(req);
    expect(res.status).toBe(404);
  });

  it("returns 409 when staff already has linked account", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    mockGetStaffById.mockResolvedValueOnce({ ...existingStaff, userId: "existing-user" });
    const req = makeRequest("/api/admin/link-account", validBody);
    const res = await linkAccountRoute(req);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toContain("already has a linked account");
  });

  it("returns 500 when auth.api.createUser returns null", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    mockGetStaffById.mockResolvedValueOnce(existingStaff);
    mockCreateUser.mockResolvedValueOnce(null);
    const req = makeRequest("/api/admin/link-account", validBody);
    const res = await linkAccountRoute(req);
    expect(res.status).toBe(500);
  });

  it("links account and returns updated staff", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    mockGetStaffById.mockResolvedValueOnce(existingStaff);
    mockCreateUser.mockResolvedValueOnce({ user: { id: "new-user-id" } });
    mockUpdateStaff.mockResolvedValueOnce({ ...existingStaff, userId: "new-user-id" });
    const req = makeRequest("/api/admin/link-account", validBody);
    const res = await linkAccountRoute(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.userId).toBe("new-user-id");
    expect(mockUpdateStaff).toHaveBeenCalledWith("s1", { userId: "new-user-id" });
  });

  it("returns 500 when auth throws", async () => {
    mockGetSession.mockResolvedValueOnce(adminSession);
    mockGetStaffById.mockResolvedValueOnce(existingStaff);
    mockCreateUser.mockRejectedValueOnce(new Error("Duplicate email"));
    const req = makeRequest("/api/admin/link-account", validBody);
    const res = await linkAccountRoute(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Duplicate email");
  });
});
