import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized, forbidden, isAdmin } from "@/lib/api-auth";
import pool from "@/lib/db";
import {
  getSlotsForSession,
  initializeSlotsForSession,
  assignStaffToSlot,
  unassignSlot,
  updateSlotTimes,
  isStaffDoubleBooked,
  getSessionById,
} from "@/lib/queries";
import { isValidTime, parseTimeToMinutes } from "@/lib/time";

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
  const { slotId, staffId, action, startTime, endTime, override } = body;

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

  if (action === "set-times") {
    // Reset to full session window when both times are cleared.
    if (startTime == null && endTime == null) {
      await updateSlotTimes(slotId, null, null);
      return NextResponse.json({ success: true });
    }
    if (
      typeof startTime !== "string" ||
      typeof endTime !== "string" ||
      !isValidTime(startTime) ||
      !isValidTime(endTime)
    ) {
      return NextResponse.json(
        { error: "startTime and endTime must both be valid times" },
        { status: 400 }
      );
    }
    if (parseTimeToMinutes(startTime) >= parseTimeToMinutes(endTime)) {
      return NextResponse.json(
        { error: "startTime must be before endTime" },
        { status: 400 }
      );
    }
    const sessionRow = await getSessionById(sessionId);
    if (!sessionRow) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    const sStart = parseTimeToMinutes(sessionRow.startTime);
    const sEnd = parseTimeToMinutes(sessionRow.endTime);
    if (parseTimeToMinutes(startTime) < sStart || parseTimeToMinutes(endTime) > sEnd) {
      return NextResponse.json(
        {
          error: `Worked time must fall within the session window (${sessionRow.startTime}–${sessionRow.endTime}).`,
        },
        { status: 400 }
      );
    }
    const ok = await updateSlotTimes(slotId, startTime, endTime);
    if (!ok) {
      return NextResponse.json(
        { error: "Slot has no assigned staff to adjust." },
        { status: 400 }
      );
    }
    return NextResponse.json({ success: true });
  } else if (action === "unassign") {
    await unassignSlot(slotId);
  } else if (staffId && typeof staffId === "string") {
    if (override !== true && (await isStaffDoubleBooked(sessionId, staffId))) {
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
    return NextResponse.json(
      { error: "staffId, action=unassign, or action=set-times required" },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
