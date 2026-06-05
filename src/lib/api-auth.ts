import { auth } from "./auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getStaffByUserId } from "./queries";

export async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export function isAdmin(session: { user: { role?: string | null } }) {
  return session.user.role === "admin";
}

/** Returns the staff.id linked to the current authenticated user, or null. */
export async function getCurrentStaffId(session: {
  user: { id: string };
}): Promise<string | null> {
  const staff = await getStaffByUserId(session.user.id);
  return staff?.id ?? null;
}
