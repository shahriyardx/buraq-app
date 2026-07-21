import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/dal";
import { getCurrency } from "@/lib/settings";
import { api } from "@/trpc/server";
import { CoursesTable } from "./courses-table";
import { PendingEnrollments } from "./pending-enrollments";

export const metadata: Metadata = { title: "Courses" };

export default async function CoursesPage() {
  await requireAdmin();

  const [pendingItems, rows, currency] = await Promise.all([
    api.courses.pendingEnrollments(),
    api.courses.list(),
    getCurrency(),
  ]);

  return (
    <>
      <PageHeader
        title="Courses"
        description="Manage course offerings, schedules, and enrollments."
      />
      <PendingEnrollments items={pendingItems} />
      <CoursesTable courses={rows} currency={currency} />
    </>
  );
}
