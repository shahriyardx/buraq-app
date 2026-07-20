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

  // Signed-in users shouldn't see the login page.
  if (hasSession && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

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
