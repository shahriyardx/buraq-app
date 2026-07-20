import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "../auth-shell";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Lost the reins?"
      subtitle="Enter your email and we'll send a link to reset your password."
      footer="Back to the gate"
    >
      <ForgotPasswordForm />
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
