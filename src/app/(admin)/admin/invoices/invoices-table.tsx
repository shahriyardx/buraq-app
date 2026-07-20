"use client";

import {
  CheckCircle2,
  Download,
  FileText,
  Mail,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { type Column, DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/format";
import { generateInvoicePdfAction, sendInvoiceEmailAction } from "./actions";
import {
  type CourseOption,
  InvoiceFormDialog,
  type StudentOption,
} from "./invoice-form-dialog";
import { MarkPaidDialog } from "./mark-paid-dialog";

export type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  studentName: string;
  courseName: string | null;
  amount: string;
  discount: string;
  net: string;
  dueDate: string;
  status: string;
  paymentMethod: string | null;
  pdfUrl: string | null;
};

function RowActions({ invoice }: { invoice: InvoiceRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [paidOpen, setPaidOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" disabled={pending}>
              <MoreHorizontal className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          {invoice.pdfUrl && (
            <DropdownMenuItem
              render={
                <Link
                  href={invoice.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              <Download className="mr-2 size-4" /> Download PDF
            </DropdownMenuItem>
          )}
          {invoice.status !== "PAID" && (
            <DropdownMenuItem onClick={() => setPaidOpen(true)}>
              <CheckCircle2 className="mr-2 size-4" /> Mark paid
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() =>
              startTransition(async () => {
                const res = await sendInvoiceEmailAction(invoice.id);
                if (res.ok) toast.success(res.message);
                else toast.error(res.message);
              })
            }
          >
            <Mail className="mr-2 size-4" /> Send email
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              startTransition(async () => {
                const res = await generateInvoicePdfAction(invoice.id);
                if (res.ok) {
                  toast.success(res.message);
                  router.refresh();
                } else {
                  toast.error(res.message);
                }
              })
            }
          >
            <FileText className="mr-2 size-4" /> Generate PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <MarkPaidDialog
        invoiceId={invoice.id}
        invoiceNumber={invoice.invoiceNumber}
        open={paidOpen}
        onOpenChange={setPaidOpen}
      />
    </>
  );
}

const STATUS_FILTERS = ["ALL", "UNPAID", "PAID", "OVERDUE"] as const;

export function InvoicesTable({
  invoices,
  students,
  courses,
}: {
  invoices: InvoiceRow[];
  students: StudentOption[];
  courses: CourseOption[];
}) {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const rows = useMemo(
    () =>
      statusFilter === "ALL"
        ? invoices
        : invoices.filter((i) => i.status === statusFilter),
    [invoices, statusFilter],
  );

  const columns: Column<InvoiceRow>[] = [
    {
      key: "invoiceNumber",
      header: "Invoice #",
      render: (i) => (
        <span className="font-mono text-xs">{i.invoiceNumber}</span>
      ),
    },
    { key: "studentName", header: "Student" },
    {
      key: "courseName",
      header: "Course",
      render: (i) => i.courseName ?? "—",
    },
    {
      key: "amount",
      header: "Amount",
      render: (i) => formatCurrency(i.net),
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
      key: "actions",
      header: "",
      className: "w-12 text-right",
      render: (i) => <RowActions invoice={i} />,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      getRowKey={(i) => i.id}
      searchText={(i) =>
        `${i.invoiceNumber} ${i.studentName} ${i.courseName ?? ""}`
      }
      searchPlaceholder="Search invoices…"
      csv={{
        filename: "invoices",
        rows: () =>
          rows.map((i) => ({
            invoice_number: i.invoiceNumber,
            student: i.studentName,
            course: i.courseName ?? "",
            amount: i.amount,
            discount: i.discount,
            net: i.net,
            due_date: i.dueDate,
            status: i.status,
            payment_method: i.paymentMethod ?? "",
          })),
      }}
      toolbar={
        <>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v ?? "ALL")}
          >
            <SelectTrigger size="sm" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === "ALL"
                    ? "All statuses"
                    : s.charAt(0) + s.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <InvoiceFormDialog
            students={students}
            courses={courses}
            trigger={
              <Button size="sm">
                <Plus className="mr-2 size-4" />
                Generate invoice
              </Button>
            }
          />
        </>
      }
    />
  );
}
