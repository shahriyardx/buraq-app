import { redirect } from "next/navigation";
import { getSession } from "@/lib/dal";
import { api } from "@/trpc/server";

export default async function RootPage() {
  const session = await getSession();
  if (!session) {
    if (await api.bootstrap.needsSetup()) redirect("/setup");
    redirect("/login");
  }
  redirect(session.user.role === "ADMIN" ? "/admin" : "/student");
}
