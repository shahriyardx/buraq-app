import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession, panelFor } from "@/lib/dal";
import { isR2Configured } from "@/lib/r2";
import { AuthShell } from "../auth-shell";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Create your account" };

export default async function RegisterPage() {
  const session = await getSession();
  if (session) redirect(panelFor(session.user.role));

  return (
    <AuthShell
      eyebrow="Join the stable"
      title="Create your rider account"
      subtitle="Register to enrol in courses and book your training slots."
      footer="New riders welcome"
    >
      <RegisterForm r2Configured={isR2Configured()} />
    </AuthShell>
  );
}
