import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized, forbidden, isAdmin } from "@/lib/api-auth";
import {
  getAllAutoAssignProfiles,
  createAutoAssignProfile,
} from "@/lib/queries";
import { validatePlan } from "@/lib/auto-assign-profiles";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  const profiles = await getAllAutoAssignProfiles();
  return NextResponse.json(profiles);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isAdmin(session)) return forbidden();

  const body = await request.json().catch(() => ({}));
  const { id, name, plan, sortOrder } = body ?? {};

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Missing or invalid id" }, { status: 400 });
  }
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Missing or invalid name" }, { status: 400 });
  }
  const validatedPlan = validatePlan(plan);
  if (!validatedPlan) {
    return NextResponse.json(
      { error: "Invalid plan: provide at least one rule with valid roles" },
      { status: 400 }
    );
  }

  try {
    const profile = await createAutoAssignProfile({
      id: id.trim(),
      name: name.trim(),
      plan: validatedPlan,
      sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
    });
    return NextResponse.json(profile, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create profile";
    if (message.includes("duplicate") || message.includes("unique")) {
      return NextResponse.json(
        { error: "A profile with that id already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
