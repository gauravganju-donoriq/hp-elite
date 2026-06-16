import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized, forbidden, isAdmin } from "@/lib/api-auth";
import { getAllStaff, getAllStaffWithEmail, createStaff } from "@/lib/queries";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  if (isAdmin(session)) {
    const staff = await getAllStaffWithEmail();
    return NextResponse.json(staff);
  }

  const staff = await getAllStaff();
  // Non-admins get a slim roster: enough to render names of assigned staff
  // in shared views, but no contact/auth/sensitive data.
  const slim = staff.map((s) => ({
    id: s.id,
    firstName: s.firstName,
    lastName: "",
    role: s.role,
    yearsExperience: 0,
  }));
  return NextResponse.json(slim);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isAdmin(session)) return forbidden();

  const body = await request.json();
  const { id, firstName, lastName, role, userId, yearsExperience } = body;

  if (!id || !firstName || !lastName || !role) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const staff = await createStaff({ id, firstName, lastName, role, userId, yearsExperience: yearsExperience ?? 0 });
  return NextResponse.json(staff, { status: 201 });
}
