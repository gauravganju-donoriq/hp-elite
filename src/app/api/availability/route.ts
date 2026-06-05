import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized, isAdmin } from "@/lib/api-auth";
import {
  getAllAvailability,
  getAvailabilityByStaff,
  upsertAvailability,
  deleteAvailability,
  getSessionById,
} from "@/lib/queries";
import { getStaffByUserId } from "@/lib/queries";

const VALID_STATUSES = new Set(["available", "unavailable", "maybe", "pending"]);

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const staffId = request.nextUrl.searchParams.get("staffId");
  const admin = isAdmin(session);

  if (!admin) {
    const myStaff = await getStaffByUserId(session.user.id);
    if (!myStaff) return NextResponse.json([]);
    const availability = await getAvailabilityByStaff(myStaff.id);
    return NextResponse.json(availability);
  }

  if (staffId) {
    const availability = await getAvailabilityByStaff(staffId);
    return NextResponse.json(availability);
  }

  const all = await getAllAvailability();
  return NextResponse.json(all);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await request.json();
  const { staffId, sessionId, status, customStartTime, customEndTime, notes } = body;

  if (!staffId || typeof staffId !== "string") {
    return NextResponse.json({ error: "Missing staffId", field: "staffId" }, { status: 400 });
  }
  if (!sessionId || typeof sessionId !== "string") {
    return NextResponse.json({ error: "Missing sessionId", field: "sessionId" }, { status: 400 });
  }
  if (!status || !VALID_STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid status", field: "status" }, { status: 400 });
  }

  const sessionExists = await getSessionById(sessionId);
  if (!sessionExists) {
    return NextResponse.json({ error: "Session not found", field: "sessionId" }, { status: 404 });
  }

  const staff = await getStaffByUserId(session.user.id);
  const isOwn = staff?.id === staffId;
  const isAdminUser = session.user.role === "admin";

  if (!isOwn && !isAdminUser) {
    return NextResponse.json({ error: "Cannot set availability for another staff member" }, { status: 403 });
  }

  await upsertAvailability({ staffId, sessionId, status, customStartTime, customEndTime, notes });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const staffId = request.nextUrl.searchParams.get("staffId");
  const sessionId = request.nextUrl.searchParams.get("sessionId");

  if (!staffId || !sessionId) {
    return NextResponse.json({ error: "staffId and sessionId are required" }, { status: 400 });
  }

  const staff = await getStaffByUserId(session.user.id);
  const isOwn = staff?.id === staffId;
  const isAdminUser = session.user.role === "admin";

  if (!isOwn && !isAdminUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await deleteAvailability(staffId, sessionId);
  return NextResponse.json({ success: true });
}
