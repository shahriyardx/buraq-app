import { TRPCError } from "@trpc/server";
import { CheckCircle2, Clock, Info } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import { requireStudent } from "@/lib/dal";
import { formatCurrency, formatDate } from "@/lib/format";
import { api } from "@/trpc/server";
import { PaymentForm } from "./payment-form";

export const metadata: Metadata = { title: "Invoice" };

export default async function StudentInvoiceDetailPage({
  params,
}: PageProps<"/student/invoices/[id]">) {
  await requireStudent();
  const { id } = await params;

  const invoice = await api.invoices.get({ id }).catch((err) => {
    if (err instanceof TRPCError && err.code === "NOT_FOUND") notFound();
    throw err;
  });

  const payable = invoice.status === "UNPAID" || invoice.status === "OVERDUE";

  return (
    <>
      <PageHeader
        title={`Invoice ${invoice.invoiceNumber}`}
        description={invoice.courseName ?? "Course payment"}
      >
        <StatusBadge status={invoice.status} />
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {invoice.status === "PROCESSING" && (
            <Card className="flex items-start gap-3 border-sky-200 bg-sky-50 p-4 text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
              <Clock className="mt-0.5 size-5 shrink-0" />
              <div>
                <p className="font-medium">Payment under review</p>
                <p className="text-sm">
                  {invoice.paymentMethod === "CASH" ? (
                    <>
                      Cash payment selected. The office will call you to verify,
                      then confirm your enrollment.
                    </>
                  ) : (
                    <>
                      We received transaction{" "}
                      <span className="font-mono">{invoice.transactionId}</span>
                      .
                    </>
                  )}{" "}
                  Your training weeks start once it is approved.
                </p>
              </div>
            </Card>
          )}

          {invoice.status === "PAID" && (
            <Card className="flex items-start gap-3 border-emerald-200 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
              <div>
                <p className="font-medium">Payment confirmed</p>
                <p className="text-sm">
                  You are all set — head to Book Training to reserve your slots.
                </p>
              </div>
            </Card>
          )}

          <Card className="p-6">
            <h2 className="font-heading text-lg font-semibold">
              Payment instructions
            </h2>
            <div className="mt-3 flex items-start gap-3 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0" />
              <p>
                Payment instructions will appear here. For now, contact the
                office
                {invoice.schoolEmail ? ` at ${invoice.schoolEmail}` : ""}
                {invoice.schoolPhone ? ` (${invoice.schoolPhone})` : ""} to pay,
                then enter your transaction id below.
              </p>
            </div>

            {payable && (
              <div className="mt-6">
                <PaymentForm invoiceId={invoice.id} />
              </div>
            )}
          </Card>
        </div>

        <Card className="h-fit p-6">
          <dl className="space-y-3 text-sm">
            <Row label="Invoice">{invoice.invoiceNumber}</Row>
            <Row label="Course">{invoice.courseName ?? "—"}</Row>
            <Row label="Amount">
              {formatCurrency(invoice.net, invoice.currency)}
            </Row>
            <Row label="Due">{formatDate(invoice.dueDate)}</Row>
            <Row label="Status">
              <StatusBadge status={invoice.status} />
            </Row>
          </dl>
        </Card>
      </div>
    </>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}
