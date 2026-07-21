import type { Metadata } from "next";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/dal";
import { formatCurrency } from "@/lib/format";
import { getCurrency } from "@/lib/settings";
import { api } from "@/trpc/server";
import { InvoicesTable } from "./invoices-table";

export const metadata: Metadata = { title: "Invoices" };

export default async function InvoicesPage() {
  await requireAdmin();

  const [data, students, courses, currency] = await Promise.all([
    api.invoices.list(),
    api.invoices.studentOptions(),
    api.invoices.courseOptions(),
    getCurrency(),
  ]);

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Generate invoices, record payments, and track outstanding balances."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total outstanding"
          value={formatCurrency(data.outstanding, currency)}
          icon="receipt"
          accent
        />
        <KpiCard label="Unpaid" value={data.unpaidCount} icon="receipt" />
        <KpiCard label="Overdue" value={data.overdueCount} icon="receipt" />
        <KpiCard label="Paid" value={data.paidCount} icon="receipt" />
      </div>

      <InvoicesTable
        invoices={data.rows}
        students={students}
        courses={courses}
        currency={currency}
      />
    </>
  );
}
