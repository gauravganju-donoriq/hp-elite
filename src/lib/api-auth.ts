import { auth } from "./auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

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
