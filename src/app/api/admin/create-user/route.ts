import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSession, unauthorized, forbidden, isAdmin } from "@/lib/api-auth";
import { createStaff } from "@/lib/queries";
import type { StaffRole } from "@/lib/types";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isAdmin(session)) return forbidden();

  const body = await request.json();
  const { email, password, name, firstName, lastName, staffRole, yearsExperience } = body;

  if (!email || !password || !firstName || !lastName || !staffRole) {
    return NextResponse.json(
      { error: "Missing required fields: email, password, firstName, lastName, staffRole" },
      { status: 400 }
    );
  }

  try {
    const newUser = await auth.api.createUser({
      body: {
        email,
        password,
        name: name || `${firstName} ${lastName}`,
        role: "user",
      },
    });

    if (!newUser) {
      return NextResponse.json({ error: "Failed to create auth user" }, { status: 500 });
    }

    const staffId = `s-${Date.now()}`;
    const staff = await createStaff({
      id: staffId,
      userId: newUser.user.id,
      firstName,
      lastName,
      role: staffRole as StaffRole,
      yearsExperience: yearsExperience ?? 0,
    });

    return NextResponse.json(staff, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
