import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized, forbidden, isAdmin } from "@/lib/api-auth";
import pool from "@/lib/db";
import {
  getSlotsForSession,
  initializeSlotsForSession,
  assignStaffToSlot,
  unassignSlot,
  isStaffDoubleBooked,
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

  const { id: sessionId } = await params;
  const body = await request.json();
  const { slotId, staffId, action } = body;

  if (!slotId || typeof slotId !== "string") {
    return NextResponse.json({ error: "slotId is required" }, { status: 400 });
  }

  const { rows } = await pool.query(
    `SELECT session_id FROM session_slot WHERE id = $1`,
    [slotId]
  );
  if (rows.length === 0) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }
  if (rows[0].session_id !== sessionId) {
    return NextResponse.json(
      { error: "Slot does not belong to this session" },
      { status: 400 }
    );
  }

  if (action === "unassign") {
    await unassignSlot(slotId);
  } else if (staffId && typeof staffId === "string") {
    if (await isStaffDoubleBooked(sessionId, staffId)) {
      return NextResponse.json(
        {
          error:
            "This staff member is already assigned to an overlapping session at the same time.",
        },
        { status: 409 }
      );
    }
    await assignStaffToSlot(slotId, staffId);
  } else {
    return NextResponse.json({ error: "staffId or action=unassign required" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
