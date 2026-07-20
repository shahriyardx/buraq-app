import { DashboardShell } from "@/components/dashboard-shell";
import { requireAdmin } from "@/lib/dal";
import { adminNav } from "@/lib/nav";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const session = await requireAdmin();
  return (
    <DashboardShell
      nav={adminNav}
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
