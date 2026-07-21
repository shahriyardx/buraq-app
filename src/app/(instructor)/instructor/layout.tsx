import { DashboardShell } from "@/components/dashboard-shell";
import { requireInstructor } from "@/lib/dal";
import { instructorNav } from "@/lib/nav";

export default async function InstructorLayout({
  children,
}: LayoutProps<"/instructor">) {
  const session = await requireInstructor();
  return (
    <DashboardShell
      nav={instructorNav}
      user={{
        name: session.user.name,
        email: session.user.email,
        role: session.user.role as string,
      }}
    >
      {children}
    </DashboardShell>
  );
}
