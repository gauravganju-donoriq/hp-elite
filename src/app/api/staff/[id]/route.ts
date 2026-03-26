import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized, forbidden, isAdmin } from "@/lib/api-auth";
import { getStaffById, updateStaff, deleteStaff } from "@/lib/queries";

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
  const deleted = await deleteStaff(id);

  if (!deleted) {
    return NextResponse.json({ error: "Staff not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
