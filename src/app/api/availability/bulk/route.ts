import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized } from "@/lib/api-auth";
import { bulkUpsertAvailability, getStaffByUserId } from "@/lib/queries";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await request.json();
  const { entries } = body;

  if (!Array.isArray(entries) || entries.length === 0) {
    return NextResponse.json({ error: "entries array is required" }, { status: 400 });
  }

  const staff = await getStaffByUserId(session.user.id);
  const isAdminUser = session.user.role === "admin";

  const allSameStaff = entries.every(
    (e: { staffId: string }) => e.staffId === staff?.id
  );

  if (!allSameStaff && !isAdminUser) {
    return NextResponse.json(
      { error: "Cannot set availability for another staff member" },
      { status: 403 }
    );
  }

  await bulkUpsertAvailability(entries);
  return NextResponse.json({ success: true, count: entries.length });
}
