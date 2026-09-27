import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/app/(auth)/auth-shell";
import { VerifyForm } from "./verify-form";

export const metadata: Metadata = { title: "Verify a certificate" };

export default function VerifyPage() {
  return (
    <AuthShell
      eyebrow="Certificate check"
      title="Verify a certificate"
      subtitle="Enter the certificate ID printed on the certificate to confirm it is genuine."
      footer="Issued with care"
    >
      <VerifyForm />
      <p className="mt-6 text-center text-sm text-[#20302a]/60">
        <Link
          href="/login"
          className="font-medium text-[#a5772f] hover:underline"
        >
          Go to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
