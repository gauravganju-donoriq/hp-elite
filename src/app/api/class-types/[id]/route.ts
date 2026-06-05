import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized, forbidden, isAdmin } from "@/lib/api-auth";
import { updateClassType, deleteClassType } from "@/lib/queries";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isAdmin(session)) return forbidden();

  const { id } = await params;
  const body = await request.json();

  const updates: { label?: string; colorKey?: string; sortOrder?: number } = {};
  if (typeof body.label === "string") updates.label = body.label.trim();
  if (typeof body.colorKey === "string") updates.colorKey = body.colorKey;
  if (typeof body.sortOrder === "number") updates.sortOrder = body.sortOrder;

  const updated = await updateClassType(id, updates);
  if (!updated) {
    return NextResponse.json({ error: "Class type not found" }, { status: 404 });
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
  const deleted = await deleteClassType(id);

  if (!deleted) {
    return NextResponse.json({ error: "Class type not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
