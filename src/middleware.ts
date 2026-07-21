import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
    pathname.startsWith("/hours") ||
    pathname.startsWith("/schedule") ||
    pathname.startsWith("/admin");

  if (!sessionCookie) {
    if (isProtected || pathname === "/") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  // Only resolve the role when it decides the destination (root and auth
  // pages). Everywhere else the cookie presence check above is enough:
  // role gating for /admin happens server-side in the admin layout, and the
  // staff layout redirects admins client-side. This keeps regular
  // navigations free of any session lookup in middleware.
  if (isAuthPage || pathname === "/") {
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
    return NextResponse.redirect(new URL(home, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
