import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

// Next.js 16 Proxy (formerly Middleware). Node.js runtime.
// Optimistic-only: checks for the presence of a session cookie to route users.
// Real authorization (role, status) is enforced in the DAL and server actions.

const PUBLIC_PATHS = [
  "/login",
  "/verify",
  "/forgot-password",
  "/reset-password",
];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(getSessionCookie(request));
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  // NOTE: we intentionally do NOT redirect cookie-bearing users away from
  // /login here. The cookie may be stale/invalid (e.g. the session row was
  // removed) — validation happens in the login page + DAL. Redirecting on mere
  // cookie presence causes a /login ↔ / loop when the session is invalid.

  // Unauthenticated users hitting a protected route go to login.
  if (!hasSession && !isPublic) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg$).*)"],
};
