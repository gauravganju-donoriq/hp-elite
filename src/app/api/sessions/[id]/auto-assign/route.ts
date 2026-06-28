import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized, forbidden, isAdmin } from "@/lib/api-auth";
import { autoAssignSession, getAutoAssignProfile } from "@/lib/queries";
import type { AutoAssignStrategy } from "@/lib/types";

const VALID_STRATEGIES: AutoAssignStrategy[] = ["cheap", "balanced", "expensive"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isAdmin(session)) return forbidden();

  const { id } = await params;

  const body = await request.json().catch(() => ({}));
  const requestedProfileId = (body as { profileId?: unknown }).profileId;
  const requestedStrategy = (body as { strategy?: unknown }).strategy;

  // Prefer an explicit profile (its stored plan); fall back to a built-in
  // strategy key for back-compat.
  if (typeof requestedProfileId === "string" && requestedProfileId.length > 0) {
    const profile = await getAutoAssignProfile(requestedProfileId);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    const result = await autoAssignSession(id, profile.plan);
    return NextResponse.json(result);
  }

  const strategy: AutoAssignStrategy =
    typeof requestedStrategy === "string" &&
    (VALID_STRATEGIES as string[]).includes(requestedStrategy)
      ? (requestedStrategy as AutoAssignStrategy)
      : "balanced";

  const result = await autoAssignSession(id, strategy);
  return NextResponse.json(result);
}
