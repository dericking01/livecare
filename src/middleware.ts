import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/admin", "/doctor"];
const AUTH_ROUTES = ["/login"];
const ROLE_ROUTES: Record<string, string[]> = {
  "/admin": ["ADMIN"],
  "/doctor": ["DOCTOR", "ADMIN"],
};

export default auth(function middleware(req) {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Redirect authenticated users away from login
  if (session && AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
    const role = session.user?.role;
    const dest =
      role === "ADMIN" ? "/admin/dashboard" : role === "DOCTOR" ? "/doctor/dashboard" : "/";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  // Protect staff routes
  for (const prefix of PROTECTED_PREFIXES) {
    if (pathname.startsWith(prefix)) {
      if (!session?.user) {
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
      }

      const allowed = ROLE_ROUTES[prefix];
      if (allowed && !allowed.includes(session.user.role)) {
        return NextResponse.redirect(new URL("/login", req.url));
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|public).*)",
  ],
};
