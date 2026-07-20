import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const redirectTo =
    typeof params.redirect === "string" && params.redirect.startsWith("/")
      ? params.redirect
      : "/";
  const inactive = params.error === "inactive";

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground">
            B
          </div>
          <span className="text-lg font-semibold tracking-tight">
            Buraq Horse Riding School
          </span>
        </div>
        <div className="space-y-4">
          <h1 className="font-heading text-3xl font-bold leading-tight">
            Ride with confidence.
          </h1>
          <p className="max-w-sm text-sidebar-foreground/70">
            Manage students, attendance, courses, certificates, and invoices —
            all in one place.
          </p>
        </div>
        <p className="text-sm text-sidebar-foreground/50">
          © {new Date().getFullYear()} Buraq Horse Riding School
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-2xl font-semibold tracking-tight">
              Welcome back
            </h2>
            <p className="text-sm text-muted-foreground">
              Sign in to access your dashboard.
            </p>
          </div>
          {inactive && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              Your account is inactive. Please contact the school
              administration.
            </div>
          )}
          <LoginForm redirectTo={redirectTo} />
        </div>
      </div>
    </div>
  );
}
