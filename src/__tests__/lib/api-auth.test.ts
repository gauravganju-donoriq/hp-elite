import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

import { isAdmin, unauthorized, forbidden } from "@/lib/api-auth";

describe("isAdmin", () => {
  it("returns true when role is admin", () => {
    expect(isAdmin({ user: { role: "admin" } })).toBe(true);
  });

  it("returns false for non-admin roles", () => {
    expect(isAdmin({ user: { role: "user" } })).toBe(false);
    expect(isAdmin({ user: { role: "staff" } })).toBe(false);
  });

  it("returns false when role is null or undefined", () => {
    expect(isAdmin({ user: { role: null } })).toBe(false);
    expect(isAdmin({ user: { role: undefined } })).toBe(false);
    expect(isAdmin({ user: {} })).toBe(false);
  });
});

describe("unauthorized", () => {
  it("returns a 401 JSON response", async () => {
    const res = unauthorized();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });
});

describe("forbidden", () => {
  it("returns a 403 JSON response", async () => {
    const res = forbidden();
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({ error: "Forbidden" });
  });
});
