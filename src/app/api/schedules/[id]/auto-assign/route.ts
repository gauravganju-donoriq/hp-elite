import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized, forbidden, isAdmin } from "@/lib/api-auth";
import {
  autoAssignSession,
  clearAssignmentsForSessions,
  getAutoAssignProfile,
  getScheduleById,
} from "@/lib/queries";
import type { AutoAssignConflict } from "@/lib/types";

// Batch auto-assign for a set of sessions in a schedule (e.g. a whole day or
// week). Optionally clears existing assignments first so a different profile
// can fully take over.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isAdmin(session)) return forbidden();

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const profileId = (body as { profileId?: unknown }).profileId;
  const rawSessionIds = (body as { sessionIds?: unknown }).sessionIds;
  const clearFirst = (body as { clearFirst?: unknown }).clearFirst === true;

  if (typeof profileId !== "string" || profileId.length === 0) {
    return NextResponse.json({ error: "Missing profileId" }, { status: 400 });
  }
  if (!Array.isArray(rawSessionIds) || rawSessionIds.length === 0) {
    return NextResponse.json({ error: "Missing sessionIds" }, { status: 400 });
  }

  const profile = await getAutoAssignProfile(profileId);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const schedule = await getScheduleById(id);
  if (!schedule) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }

  // Only operate on sessions that actually belong to this schedule.
  const scheduleSessionIds = new Set(schedule.sessions.map((s) => s.id));
  const requested = new Set(
    rawSessionIds.filter(
      (sid): sid is string => typeof sid === "string"
    )
  );
  const sessionIds = schedule.sessions
    .map((s) => s.id)
    .filter((sid) => requested.has(sid) && scheduleSessionIds.has(sid));

  if (sessionIds.length === 0) {
    return NextResponse.json({ assigned: 0, empty: 0, conflicts: [] });
  }

  if (clearFirst) {
    await clearAssignmentsForSessions(sessionIds);
  }

  let assigned = 0;
  let empty = 0;
  const conflicts: AutoAssignConflict[] = [];

  for (const sessionId of sessionIds) {
    const result = await autoAssignSession(sessionId, profile.plan);
    assigned += result.assigned;
    empty += result.empty;
    conflicts.push(...result.conflicts);
  }

  return NextResponse.json({ assigned, empty, conflicts });
}
