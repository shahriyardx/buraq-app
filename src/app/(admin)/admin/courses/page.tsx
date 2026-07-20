import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/dal";
import { api } from "@/trpc/server";
import { CoursesTable } from "./courses-table";
import { PendingEnrollments } from "./pending-enrollments";

export const metadata: Metadata = { title: "Courses" };

export default async function CoursesPage() {
  await requireAdmin();

  const [pendingItems, rows] = await Promise.all([
    api.courses.pendingEnrollments(),
    api.courses.list(),
  ]);

  return (
    <>
      <PageHeader
        title="Courses"
        description="Manage course offerings, schedules, and enrollments."
      />
      <PendingEnrollments items={pendingItems} />
      <CoursesTable courses={rows} />
    </>
  );
}
