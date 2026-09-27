import { DashboardShell } from "@/components/dashboard-shell";
import { requireStudent } from "@/lib/dal";
import { studentNav } from "@/lib/nav";

export default async function StudentLayout({
  children,
}: LayoutProps<"/student">) {
  const session = await requireStudent();
  return (
    <DashboardShell
      nav={studentNav}
      user={{
        name: session.user.name,
        email: session.user.email,
        role: session.user.role as string,
        photoUrl: session.user.photoUrl ?? null,
      }}
    >
      {children}
    </DashboardShell>
  );
}
