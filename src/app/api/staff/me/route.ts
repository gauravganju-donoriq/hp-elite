import { NextResponse } from "next/server";
import { getSession, unauthorized } from "@/lib/api-auth";
import { getStaffByUserId } from "@/lib/queries";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  const staff = await getStaffByUserId(session.user.id);
  if (!staff) {
    return NextResponse.json(null);
  }
  return NextResponse.json(staff);
}
