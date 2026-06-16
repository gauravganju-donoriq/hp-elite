import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getSession, unauthorized, forbidden, isAdmin } from "@/lib/api-auth";
import { getStaffById } from "@/lib/queries";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isAdmin(session)) return forbidden();

  const body = await request.json();
  const { staffId, newPassword } = body;

  if (!staffId || !newPassword) {
    return NextResponse.json(
      { error: "Missing required fields: staffId, newPassword" },
      { status: 400 }
    );
  }

  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const staff = await getStaffById(staffId);
  if (!staff) {
    return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
  }
  if (!staff.userId) {
    return NextResponse.json(
      { error: "Staff member does not have a linked account" },
      { status: 400 }
    );
  }

  try {
    await auth.api.setUserPassword({
      body: {
        newPassword,
        userId: staff.userId,
      },
      headers: await headers(),
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to reset password";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
