import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized, forbidden, isAdmin } from "@/lib/api-auth";
import { getStaffById, getUserByEmail, updateUserEmail } from "@/lib/queries";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isAdmin(session)) return forbidden();

  const body = await request.json();
  const staffId = body?.staffId as string | undefined;
  const email = typeof body?.email === "string" ? body.email.trim() : undefined;

  if (!staffId || !email) {
    return NextResponse.json(
      { error: "Missing required fields: staffId, email" },
      { status: 400 }
    );
  }

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  const staff = await getStaffById(staffId);
  if (!staff) {
    return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
  }
  if (!staff.userId) {
    return NextResponse.json(
      { error: "Staff member does not have a linked account" },
      { status: 400 }
    );
  }

  const existing = await getUserByEmail(email);
  if (existing && existing.id !== staff.userId) {
    return NextResponse.json(
      { error: "That email is already in use by another account" },
      { status: 409 }
    );
  }

  try {
    const updated = await updateUserEmail(staff.userId, email);
    if (!updated) {
      return NextResponse.json({ error: "Linked account not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, email }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update email";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
