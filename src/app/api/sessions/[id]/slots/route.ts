import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized, forbidden, isAdmin } from "@/lib/api-auth";
import {
  getSlotsForSession,
  initializeSlotsForSession,
  assignStaffToSlot,
  unassignSlot,
} from "@/lib/queries";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const slots = await getSlotsForSession(id);
  return NextResponse.json(slots);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isAdmin(session)) return forbidden();

  const { id: sessionId } = await params;
  const body = await request.json();
  const { count } = body;

  if (typeof count !== "number" || count < 0) {
    return NextResponse.json({ error: "count must be a non-negative number" }, { status: 400 });
  }

  const slots = await initializeSlotsForSession(sessionId, count);
  return NextResponse.json(slots);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isAdmin(session)) return forbidden();

  await params;
  const body = await request.json();
  const { slotId, staffId, action } = body;

  if (!slotId) {
    return NextResponse.json({ error: "slotId is required" }, { status: 400 });
  }

  if (action === "unassign") {
    await unassignSlot(slotId);
  } else if (staffId) {
    await assignStaffToSlot(slotId, staffId);
  } else {
    return NextResponse.json({ error: "staffId or action=unassign required" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
