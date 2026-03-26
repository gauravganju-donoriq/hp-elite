import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const STAFF_ROUTES = ["/dashboard", "/availability"];

export async function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const { pathname } = request.nextUrl;

  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/availability") ||
    pathname.startsWith("/admin");
  const isApiRoute = pathname.startsWith("/api");
  const isStaffRoute = STAFF_ROUTES.some((r) => pathname.startsWith(r));

  if (isApiRoute) {
    return NextResponse.next();
  }

  if (!sessionCookie && isProtected) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!sessionCookie && pathname === "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (sessionCookie) {
    try {
      const sessionRes = await fetch(
        new URL("/api/auth/get-session", request.url),
        { headers: { cookie: request.headers.get("cookie") || "" } }
      );
      if (sessionRes.ok) {
        const session = await sessionRes.json();
        const role = session?.user?.role;

        if (role === "admin" && isStaffRoute) {
          return NextResponse.redirect(new URL("/admin", request.url));
        }

        if (isAuthPage) {
          return NextResponse.redirect(
            new URL(role === "admin" ? "/admin" : "/dashboard", request.url)
          );
        }

        if (pathname === "/") {
          return NextResponse.redirect(
            new URL(role === "admin" ? "/admin" : "/dashboard", request.url)
          );
        }
      }
    } catch {
      // If session fetch fails, fall through
    }

    if (isAuthPage) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
