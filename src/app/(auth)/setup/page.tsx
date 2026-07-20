import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { api } from "@/trpc/server";
import { AuthShell } from "../auth-shell";
import { SetupForm } from "./setup-form";

export const metadata: Metadata = { title: "Create administrator" };

export default async function SetupPage() {
  const needsSetup = await api.bootstrap.needsSetup();
  if (!needsSetup) redirect("/login");

  return (
    <AuthShell
      eyebrow="First ride"
      title="Set up the stable office"
      subtitle="No administrator exists yet. Create the first one — this account becomes the super-admin."
      footer="Head groom"
    >
      <SetupForm />
    </AuthShell>
  );
}
