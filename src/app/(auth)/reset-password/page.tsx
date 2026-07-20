import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "../auth-shell";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Reset password" };

export default async function ResetPasswordPage({
  searchParams,
}: PageProps<"/reset-password">) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : null;
  const invalid = params.error === "INVALID_TOKEN";

  return (
    <AuthShell
      title="A fresh set of reins"
      subtitle="Choose a new password for your account."
      footer="Ride safe"
    >
      {!token || invalid ? (
        <div className="rounded-md border border-red-800/25 bg-red-900/5 p-4 text-sm text-red-900">
          This reset link is invalid or has expired.{" "}
          <Link
            href="/forgot-password"
            className="font-medium text-[#a5772f] underline"
          >
            Request a new one
          </Link>
          .
        </div>
      ) : (
        <ResetPasswordForm token={token} />
      )}
      <p className="mt-6 text-center text-sm text-[#20302a]/60">
        <Link
          href="/login"
          className="font-medium text-[#a5772f] hover:underline"
        >
          Return to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
