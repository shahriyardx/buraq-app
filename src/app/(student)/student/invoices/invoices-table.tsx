"use client";

import { Download } from "lucide-react";
import Link from "next/link";
import { type Column, DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";

export type StudentInvoiceRow = {
  id: string;
  invoiceNumber: string;
  courseName: string | null;
  net: string;
  dueDate: string;
  status: string;
  pdfUrl: string | null;
};

export function StudentInvoicesTable({
  invoices,
  currency,
}: {
  invoices: StudentInvoiceRow[];
  currency: string;
}) {
  const columns: Column<StudentInvoiceRow>[] = [
    {
      key: "invoiceNumber",
      header: "Invoice #",
      render: (i) => (
        <span className="font-mono text-xs">{i.invoiceNumber}</span>
      ),
    },
    {
      key: "courseName",
      header: "Course",
      render: (i) => i.courseName ?? "—",
    },
    {
      key: "net",
      header: "Amount",
      render: (i) => formatCurrency(i.net, currency),
    },
    {
      key: "dueDate",
      header: "Due",
      render: (i) => formatDate(i.dueDate),
    },
    {
      key: "status",
      header: "Status",
      render: (i) => <StatusBadge status={i.status} />,
    },
    {
      key: "pdfUrl",
      header: "",
      className: "w-24 text-right",
      render: (i) =>
        i.pdfUrl ? (
          <Link
            href={i.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Download className="mr-2 size-4" /> PDF
          </Link>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={invoices}
      getRowKey={(i) => i.id}
      searchText={(i) => `${i.invoiceNumber} ${i.courseName ?? ""} ${i.status}`}
      searchPlaceholder="Search invoices…"
      emptyMessage="You have no invoices yet."
      csv={{
        filename: "my-invoices",
        rows: () =>
          invoices.map((i) => ({
            invoice_number: i.invoiceNumber,
            course: i.courseName ?? "",
            amount: i.net,
            due_date: i.dueDate,
            status: i.status,
          })),
      }}
    />
  );
}
