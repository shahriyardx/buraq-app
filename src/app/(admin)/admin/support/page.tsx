import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { TicketsTable } from "./tickets-table";

export const metadata: Metadata = { title: "Support" };

export default async function SupportPage() {
  await requireAdmin();

  const tickets = await prisma.supportTicket.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      student: { select: { name: true, studentId: true } },
      _count: { select: { messages: true } },
    },
  });

  const rows = tickets.map((t) => ({
    id: t.id,
    ticketId: t.ticketId,
    subject: t.subject,
    studentName: t.student.name,
    studentId: t.student.studentId,
    category: t.category,
    status: t.status,
    messagesCount: t._count.messages,
  }));

  return (
    <>
      <PageHeader
        title="Support"
        description="Respond to student tickets and track their status."
      />
      <TicketsTable tickets={rows} />
    </>
  );
}
