import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const STAFF_ROUTES = ["/dashboard", "/availability"];

// Maintenance mode: short-circuit every request while the database migration
// is in progress. Lifted by reverting this commit.
const MAINTENANCE_MODE = true;

const MAINTENANCE_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Down for maintenance</title>
    <style>
      body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; font-family: system-ui, -apple-system, sans-serif; background: #0b0b0c; color: #f4f4f5; }
      main { text-align: center; padding: 2rem; max-width: 32rem; }
      h1 { font-size: 1.5rem; margin: 0 0 0.75rem; }
      p { margin: 0; color: #a1a1aa; line-height: 1.6; }
    </style>
  </head>
  <body>
    <main>
      <h1>App down for maintenance</h1>
      <p>We're performing scheduled maintenance and will be back shortly. Thanks for your patience.</p>
    </main>
  </body>
</html>`;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (MAINTENANCE_MODE) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json(
        { error: "Service unavailable: app is down for maintenance." },
        { status: 503, headers: { "Retry-After": "3600" } }
      );
    }
    return new NextResponse(MAINTENANCE_HTML, {
      status: 503,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Retry-After": "3600",
      },
    });
  }

  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const sessionCookie = getSessionCookie(request);
  const isAuthPage = pathname === "/login" || pathname === "/signup";
  // /schedule is a shared route: protected (login required) but neither a
  // staff-only nor admin-only route, so both roles can view it.
  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/availability") ||
    pathname.startsWith("/schedule") ||
    pathname.startsWith("/admin");
  const isStaffRoute = STAFF_ROUTES.some((r) => pathname.startsWith(r));
  const isAdminRoute = pathname.startsWith("/admin");

  if (!sessionCookie) {
    if (isProtected || pathname === "/") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  let role: string | undefined;
  try {
    const sessionRes = await fetch(
      new URL("/api/auth/get-session", request.url),
      { headers: { cookie: request.headers.get("cookie") || "" } }
    );
    if (sessionRes.ok) {
      const session = await sessionRes.json();
      role = session?.user?.role;
    }
  } catch {
    // Session fetch failed - fall back to "logged in but unknown role".
  }

  const home = role === "admin" ? "/admin" : "/dashboard";

  if (isAuthPage || pathname === "/") {
    return NextResponse.redirect(new URL(home, request.url));
  }

  if (role === "admin" && isStaffRoute) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  if (role !== "admin" && isAdminRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
