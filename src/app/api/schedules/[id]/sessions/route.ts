import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized, forbidden, isAdmin } from "@/lib/api-auth";
import { getSessionsByScheduleId, createSessions } from "@/lib/queries";
import type { Session } from "@/lib/types";

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

  const withScheduleId: Session[] = sessions.map((s: Record<string, unknown>) => ({
    ...s,
    scheduleId,
  } as Session));

  await createSessions(withScheduleId);
  return NextResponse.json({ success: true, count: sessions.length }, { status: 201 });
}
