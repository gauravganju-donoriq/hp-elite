import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSession, unauthorized, forbidden, isAdmin } from "@/lib/api-auth";
import { getStaffById, updateStaff } from "@/lib/queries";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isAdmin(session)) return forbidden();

  const body = await request.json();
  const { staffId, email, password } = body;

  if (!staffId || !email || !password) {
    return NextResponse.json(
      { error: "Missing required fields: staffId, email, password" },
      { status: 400 }
    );
  }

  const existing = await getStaffById(staffId);
  if (!existing) {
    return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
  }
  if (existing.userId) {
    return NextResponse.json({ error: "Staff member already has a linked account" }, { status: 409 });
  }

  try {
    const newUser = await auth.api.createUser({
      body: {
        email,
        password,
        name: `${existing.firstName} ${existing.lastName}`,
        role: "user",
      },
    });

    if (!newUser) {
      return NextResponse.json({ error: "Failed to create auth user" }, { status: 500 });
    }

    const updated = await updateStaff(staffId, { userId: newUser.user.id });

    return NextResponse.json(updated, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to link account";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
