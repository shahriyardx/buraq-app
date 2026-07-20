import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/dal";
import { api } from "@/trpc/server";
import { TicketsTable } from "./tickets-table";

export const metadata: Metadata = { title: "Support" };

export default async function SupportPage() {
  await requireAdmin();

  const tickets = await api.support.list();

  return (
    <>
      <PageHeader
        title="Support"
        description="Respond to student tickets and track their status."
      />
      <TicketsTable tickets={tickets} />
    </>
  );
}
