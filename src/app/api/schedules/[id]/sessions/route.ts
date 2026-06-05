import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized, forbidden, isAdmin } from "@/lib/api-auth";
import { getSessionsByScheduleId, createSessions, getScheduleById } from "@/lib/queries";
import type { Session } from "@/lib/types";
import { isValidTime, parseTimeToMinutes } from "@/lib/time";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const sessions = await getSessionsByScheduleId(id);
  return NextResponse.json(sessions);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isAdmin(session)) return forbidden();

  const { id: scheduleId } = await params;
  const body = await request.json();
  const { sessions } = body;

  if (!Array.isArray(sessions) || sessions.length === 0) {
    return NextResponse.json({ error: "sessions array is required" }, { status: 400 });
  }

  const schedule = await getScheduleById(scheduleId);
  if (!schedule) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }

  for (let i = 0; i < sessions.length; i++) {
    const s = sessions[i] as Partial<Session>;
    const where = `sessions[${i}]`;
    if (!s.id || typeof s.id !== "string") {
      return NextResponse.json({ error: `${where}.id missing or invalid`, field: "id" }, { status: 400 });
    }
    if (!s.date || typeof s.date !== "string" || !ISO_DATE.test(s.date)) {
      return NextResponse.json({ error: `${where}.date invalid (expected YYYY-MM-DD)`, field: "date" }, { status: 400 });
    }
    if (s.date < schedule.startDate || s.date > schedule.endDate) {
      return NextResponse.json(
        { error: `${where}.date is outside the schedule range`, field: "date" },
        { status: 400 }
      );
    }
    if (!s.startTime || typeof s.startTime !== "string" || !isValidTime(s.startTime)) {
      return NextResponse.json({ error: `${where}.startTime invalid`, field: "startTime" }, { status: 400 });
    }
    if (!s.endTime || typeof s.endTime !== "string" || !isValidTime(s.endTime)) {
      return NextResponse.json({ error: `${where}.endTime invalid`, field: "endTime" }, { status: 400 });
    }
    if (parseTimeToMinutes(s.endTime) <= parseTimeToMinutes(s.startTime)) {
      return NextResponse.json(
        { error: `${where}.endTime must be after startTime`, field: "endTime" },
        { status: 400 }
      );
    }
    if (!s.location || typeof s.location !== "string") {
      return NextResponse.json({ error: `${where}.location is required`, field: "location" }, { status: 400 });
    }
    if (
      typeof s.requiredStaff !== "number" ||
      !Number.isFinite(s.requiredStaff) ||
      s.requiredStaff < 0
    ) {
      return NextResponse.json(
        { error: `${where}.requiredStaff must be a non-negative number`, field: "requiredStaff" },
        { status: 400 }
      );
    }
  }

  const withScheduleId: Session[] = sessions.map((s: Record<string, unknown>) => ({
    ...s,
    scheduleId,
  } as Session));

  await createSessions(withScheduleId);
  return NextResponse.json({ success: true, count: sessions.length }, { status: 201 });
}
