import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSession, unauthorized, forbidden, isAdmin } from "@/lib/api-auth";
import { getStaffById, updateStaff, deleteStaff, hardDeleteUser } from "@/lib/queries";
import { auth } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const staff = await getStaffById(id);
  if (!staff) {
    return NextResponse.json({ error: "Staff not found" }, { status: 404 });
  }
  return NextResponse.json(staff);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isAdmin(session)) return forbidden();

  const { id } = await params;
  const body = await request.json();
  const updated = await updateStaff(id, body);

  if (!updated) {
    return NextResponse.json({ error: "Staff not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isAdmin(session)) return forbidden();

  const { id } = await params;
  const existing = await getStaffById(id);
  if (!existing) {
    return NextResponse.json({ error: "Staff not found" }, { status: 404 });
  }

  const deleted = await deleteStaff(id);
  if (!deleted) {
    return NextResponse.json({ error: "Staff not found" }, { status: 404 });
  }

  // Remove the linked auth user so they can't sign in any more and so the
  // email can be reused later. Try Better Auth's removeUser first, then always
  // run a hard delete to clean up any leftover user/account/session rows.
  if (existing.userId) {
    try {
      await auth.api.removeUser({
        body: { userId: existing.userId },
        headers: await headers(),
      });
    } catch (err) {
      console.error(
        `removeUser failed for ${existing.userId} (staff ${id}); falling back to hard delete:`,
        err
      );
    }

    try {
      await hardDeleteUser(existing.userId);
    } catch (err) {
      console.error(
        `Failed to hard-delete auth user ${existing.userId} for staff ${id}:`,
        err
      );
    }
  }

  return NextResponse.json({ success: true });
}
