import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized } from "@/lib/api-auth";
import {
  getAllAvailability,
  getAvailabilityByStaff,
  upsertAvailability,
  deleteAvailability,
} from "@/lib/queries";
import { getStaffByUserId } from "@/lib/queries";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const staffId = request.nextUrl.searchParams.get("staffId");

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

  if (!staffId || !sessionId || !status) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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
