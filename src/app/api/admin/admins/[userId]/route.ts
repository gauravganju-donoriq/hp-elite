import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized, forbidden, isAdmin } from "@/lib/api-auth";
import { getAdminUsers, getUserById, setUserRole } from "@/lib/queries";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isAdmin(session)) return forbidden();

  const { userId } = await params;

  if (userId === session.user.id) {
    return NextResponse.json(
      { error: "You cannot remove your own admin access." },
      { status: 400 }
    );
  }

  const target = await getUserById(userId);
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (target.role !== "admin") {
    return NextResponse.json({ error: "User is not an admin" }, { status: 400 });
  }

  const admins = await getAdminUsers();
  if (admins.length <= 1) {
    return NextResponse.json(
      { error: "Cannot remove the last remaining admin." },
      { status: 400 }
    );
  }

  await setUserRole(userId, "user");
  return NextResponse.json({ success: true }, { status: 200 });
}
