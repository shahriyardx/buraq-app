import { AlertTriangle } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { requireStudent } from "@/lib/dal";
import { formatCurrency } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { StudentInvoicesTable } from "./invoices-table";

export const metadata: Metadata = { title: "Invoices" };

export default async function StudentInvoicesPage() {
  const session = await requireStudent();
  const studentId = session.user.id;

  // Flag past-due invoices before reading so the banner and rows reflect reality.
  await prisma.invoice.updateMany({
    where: { studentId, status: "UNPAID", dueDate: { lt: new Date() } },
    data: { status: "OVERDUE" },
  });

  const invoices = await prisma.invoice.findMany({
    where: { studentId },
    orderBy: { createdAt: "desc" },
    include: { course: { select: { name: true } } },
  });

  const rows = invoices.map((i) => ({
    id: i.id,
    invoiceNumber: i.invoiceNumber,
    courseName: i.course?.name ?? null,
    net: (Number(i.amount) - Number(i.discount)).toFixed(2),
    dueDate: i.dueDate.toISOString(),
    status: i.status,
    pdfUrl: i.pdfUrl,
  }));

  const outstandingInvoices = invoices.filter(
    (i) => i.status === "UNPAID" || i.status === "OVERDUE",
  );
  const outstandingTotal = outstandingInvoices.reduce(
    (sum, i) => sum + (Number(i.amount) - Number(i.discount)),
    0,
  );

  return (
    <>
      <PageHeader
        title="Invoices"
        description="View your invoices, outstanding balance, and download receipts."
      />

      {outstandingInvoices.length > 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" />
          <div className="space-y-0.5">
            <p className="font-medium">
              {outstandingInvoices.length} unpaid invoice
              {outstandingInvoices.length === 1 ? "" : "s"}
            </p>
            <p className="text-sm">
              You have an outstanding balance of{" "}
              <span className="font-semibold">
                {formatCurrency(outstandingTotal)}
              </span>
              . Please contact the office to settle your account.
            </p>
          </div>
        </div>
      )}

      <StudentInvoicesTable invoices={rows} />
    </>
  );
}
