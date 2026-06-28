import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized, forbidden, isAdmin } from "@/lib/api-auth";
import {
  updateAutoAssignProfile,
  deleteAutoAssignProfile,
} from "@/lib/queries";
import { validatePlan } from "@/lib/auto-assign-profiles";
import type { AutoAssignProfile } from "@/lib/types";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isAdmin(session)) return forbidden();

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const updates: Partial<Pick<AutoAssignProfile, "name" | "plan" | "sortOrder">> =
    {};
  if (typeof body.name === "string") updates.name = body.name.trim();
  if (typeof body.sortOrder === "number") updates.sortOrder = body.sortOrder;
  if (body.plan !== undefined) {
    const validatedPlan = validatePlan(body.plan);
    if (!validatedPlan) {
      return NextResponse.json(
        { error: "Invalid plan: provide at least one rule with valid roles" },
        { status: 400 }
      );
    }
    updates.plan = validatedPlan;
  }

  const updated = await updateAutoAssignProfile(id, updates);
  if (!updated) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isAdmin(session)) return forbidden();

  const { id } = await params;
  const deleted = await deleteAutoAssignProfile(id);

  if (!deleted) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
