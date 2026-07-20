import { redirect } from "next/navigation";
import { getSession } from "@/lib/dal";

export default async function RootPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  redirect(session.user.role === "ADMIN" ? "/admin" : "/student");
}
