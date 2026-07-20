import type { Metadata } from "next";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/dal";
import { formatCurrency } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { markOverdue } from "./actions";
import { InvoicesTable } from "./invoices-table";

export const metadata: Metadata = { title: "Invoices" };

export default async function InvoicesPage() {
  await requireAdmin();

  // Flag past-due invoices before reading so KPIs and rows reflect reality.
  await markOverdue();

  const [invoices, students, courses] = await Promise.all([
    prisma.invoice.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        student: { select: { name: true } },
        course: { select: { name: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: "STUDENT" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.course.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, price: true },
    }),
  ]);

  const rows = invoices.map((i) => {
    const amount = Number(i.amount);
    const discount = Number(i.discount);
    return {
      id: i.id,
      invoiceNumber: i.invoiceNumber,
      studentName: i.student.name,
      courseName: i.course?.name ?? null,
      amount: amount.toFixed(2),
      discount: discount.toFixed(2),
      net: (amount - discount).toFixed(2),
      dueDate: i.dueDate.toISOString(),
      status: i.status,
      paymentMethod: i.paymentMethod,
      pdfUrl: i.pdfUrl,
    };
  });

  const outstanding = invoices
    .filter((i) => i.status === "UNPAID" || i.status === "OVERDUE")
    .reduce((sum, i) => sum + (Number(i.amount) - Number(i.discount)), 0);

  const unpaidCount = invoices.filter((i) => i.status === "UNPAID").length;
  const overdueCount = invoices.filter((i) => i.status === "OVERDUE").length;
  const paidCount = invoices.filter((i) => i.status === "PAID").length;

  const courseOptions = courses.map((c) => ({
    id: c.id,
    name: c.name,
    price: Number(c.price).toFixed(2),
  }));

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Generate invoices, record payments, and track outstanding balances."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total outstanding"
          value={formatCurrency(outstanding)}
          icon="receipt"
          accent
        />
        <KpiCard label="Unpaid" value={unpaidCount} icon="receipt" />
        <KpiCard label="Overdue" value={overdueCount} icon="receipt" />
        <KpiCard label="Paid" value={paidCount} icon="receipt" />
      </div>

      <InvoicesTable
        invoices={rows}
        students={students}
        courses={courseOptions}
      />
    </>
  );
}
