import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth";

/**
 * Primary authorization layer. Reads and validates the session against the DB
 * on every call (memoized per-request via React `cache`). The `proxy.ts`
 * redirect is only an optimistic first pass — real checks live here and in
 * server actions.
 */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** Home panel path for a given role. */
export function panelFor(role: string | null | undefined) {
  if (role === "ADMIN") return "/admin";
  if (role === "INSTRUCTOR") return "/instructor";
  return "/student";
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.status === "INACTIVE") redirect("/login?error=inactive");
  if (session.user.role !== "ADMIN") redirect(panelFor(session.user.role));
  return session;
}

export async function requireInstructor() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.status === "INACTIVE") redirect("/login?error=inactive");
  if (session.user.role !== "INSTRUCTOR") redirect(panelFor(session.user.role));
  return session;
}

export async function requireStudent() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.status === "INACTIVE") redirect("/login?error=inactive");
  if (session.user.role !== "STUDENT") redirect(panelFor(session.user.role));
  return session;
}
