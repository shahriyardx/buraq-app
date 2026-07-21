import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession, panelFor } from "@/lib/dal";
import { api } from "@/trpc/server";
import { AuthShell } from "../auth-shell";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const session = await getSession();
  if (session) redirect(panelFor(session.user.role));
  if (await api.bootstrap.needsSetup()) redirect("/setup");

  const params = await searchParams;
  const redirectTo =
    typeof params.redirect === "string" && params.redirect.startsWith("/")
      ? params.redirect
      : "/";
  const inactive = params.error === "inactive";

  return (
    <AuthShell
      title="Buraq Riding School"
      subtitle="Welcome back to the stable — sign in to saddle up your dashboard."
    >
      {inactive && (
        <div className="mb-4 rounded-md border border-red-800/25 bg-red-900/5 p-3 text-sm text-red-900">
          Your account is inactive. Please contact the stable office.
        </div>
      )}
      <LoginForm redirectTo={redirectTo} />
    </AuthShell>
  );
}
