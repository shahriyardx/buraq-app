import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/dal";
import { api } from "@/trpc/server";
import { UsersTable } from "./users-table";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage() {
  await requireAdmin();
  const data = await api.users.list();

  return (
    <>
      <PageHeader
        title="Users"
        description={
          data.isSuperAdmin
            ? "All accounts. Promote a user to admin or remove admin access."
            : "All accounts. Only the super-admin can change admin access."
        }
      />
      <UsersTable
        users={data.users}
        isSuperAdmin={data.isSuperAdmin}
        currentUserId={data.currentUserId}
      />
    </>
  );
}
