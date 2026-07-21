import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSession, unauthorized, forbidden, isAdmin } from "@/lib/api-auth";
import { getAdminUsers, getUserByEmail, setUserRole } from "@/lib/queries";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isAdmin(session)) return forbidden();

  const admins = await getAdminUsers();
  return NextResponse.json(admins);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isAdmin(session)) return forbidden();

  const body = await request.json();
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  try {
    // Promote an existing account, or create a brand-new admin account.
    const existing = await getUserByEmail(email);

    if (existing) {
      await setUserRole(existing.id, "admin");
      return NextResponse.json(
        { id: existing.id, email: existing.email, promoted: true },
        { status: 200 }
      );
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        {
          error:
            "No account exists for this email. Provide a password (min 8 characters) to create a new admin account.",
        },
        { status: 400 }
      );
    }

    const created = await auth.api.createUser({
      body: {
        email,
        password,
        name: name || email.split("@")[0],
        role: "admin",
      },
    });

    if (!created) {
      return NextResponse.json(
        { error: "Failed to create admin account" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { id: created.user.id, email: created.user.email, promoted: false },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to add admin";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
