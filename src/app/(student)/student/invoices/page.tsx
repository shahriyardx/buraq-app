import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";
import { PageHeader } from "@/components/page-header";
import { requireStudent } from "@/lib/dal";

export const metadata: Metadata = { title: "Invoices" };

export default async function StudentPage() {
  await requireStudent();
  return (
    <>
      <PageHeader title="Invoices" />
      <ComingSoon feature="Invoices" />
    </>
  );
}
