import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const STAFF_ROUTES = ["/dashboard", "/availability"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const sessionCookie = getSessionCookie(request);
  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/availability") ||
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
