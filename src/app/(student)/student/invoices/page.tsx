import { AlertTriangle } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { requireStudent } from "@/lib/dal";
import { formatCurrency } from "@/lib/format";
import { getCurrency } from "@/lib/settings";
import { api } from "@/trpc/server";
import { StudentInvoicesTable } from "./invoices-table";

export const metadata: Metadata = { title: "Invoices" };

export default async function StudentInvoicesPage() {
  await requireStudent();

  const [{ rows, outstandingCount, outstandingTotal }, currency] =
    await Promise.all([api.invoices.mine(), getCurrency()]);

  return (
    <>
      <PageHeader
        title="Invoices"
        description="View your invoices, outstanding balance, and download receipts."
      />

      {outstandingCount > 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" />
          <div className="space-y-0.5">
            <p className="font-medium">
              {outstandingCount} unpaid invoice
              {outstandingCount === 1 ? "" : "s"}
            </p>
            <p className="text-sm">
              You have an outstanding balance of{" "}
              <span className="font-semibold">
                {formatCurrency(outstandingTotal, currency)}
              </span>
              . Please contact the office to settle your account.
            </p>
          </div>
        </div>
      )}

      <StudentInvoicesTable invoices={rows} currency={currency} />
    </>
  );
}
