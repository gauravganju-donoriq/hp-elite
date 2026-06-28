import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized, forbidden, isAdmin } from "@/lib/api-auth";
import { clearAssignmentsForSessions } from "@/lib/queries";

// Bulk-clears all slot assignments for the given sessions (used by the
// "clear day/week" action). Admin only.
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isAdmin(session)) return forbidden();

  const body = await request.json().catch(() => ({}));
  const rawSessionIds = (body as { sessionIds?: unknown }).sessionIds;

  if (!Array.isArray(rawSessionIds)) {
    return NextResponse.json({ error: "Missing sessionIds" }, { status: 400 });
  }
  const sessionIds = rawSessionIds.filter(
    (sid): sid is string => typeof sid === "string"
  );

  const cleared = await clearAssignmentsForSessions(sessionIds);
  return NextResponse.json({ cleared });
}
