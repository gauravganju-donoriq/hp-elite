import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized, forbidden, isAdmin } from "@/lib/api-auth";
import { getSessionById, updateSession, deleteSession } from "@/lib/queries";
import { isValidTime, parseTimeToMinutes } from "@/lib/time";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const sess = await getSessionById(id);
  if (!sess) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  return NextResponse.json(sess);
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

  if (body.date !== undefined && (typeof body.date !== "string" || !ISO_DATE.test(body.date))) {
    return NextResponse.json({ error: "Invalid date", field: "date" }, { status: 400 });
  }
  if (body.startTime !== undefined && (typeof body.startTime !== "string" || !isValidTime(body.startTime))) {
    return NextResponse.json({ error: "Invalid startTime", field: "startTime" }, { status: 400 });
  }
  if (body.endTime !== undefined && (typeof body.endTime !== "string" || !isValidTime(body.endTime))) {
    return NextResponse.json({ error: "Invalid endTime", field: "endTime" }, { status: 400 });
  }
  if (body.startTime !== undefined || body.endTime !== undefined) {
    const existing = await getSessionById(id);
    if (!existing) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    const startTime = body.startTime ?? existing.startTime;
    const endTime = body.endTime ?? existing.endTime;
    if (parseTimeToMinutes(endTime) <= parseTimeToMinutes(startTime)) {
      return NextResponse.json(
        { error: "endTime must be after startTime", field: "endTime" },
        { status: 400 }
      );
    }
  }
  if (
    body.requiredStaff !== undefined &&
    (typeof body.requiredStaff !== "number" ||
      !Number.isFinite(body.requiredStaff) ||
      body.requiredStaff < 0)
  ) {
    return NextResponse.json(
      { error: "requiredStaff must be a non-negative number", field: "requiredStaff" },
      { status: 400 }
    );
  }

  const success = await updateSession(id, body);

  if (!success) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const updated = await getSessionById(id);
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
  const deleted = await deleteSession(id);

  if (!deleted) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
