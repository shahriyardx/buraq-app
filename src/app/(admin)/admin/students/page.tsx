import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/dal";
import { api } from "@/trpc/server";
import { StudentsTable } from "./students-table";

export const metadata: Metadata = { title: "Students" };

export default async function StudentsPage() {
  await requireAdmin();
  const [students, courses] = await Promise.all([
    api.students.list(),
    api.students.courseOptions(),
  ]);

  return (
    <>
      <PageHeader
        title="Students"
        description="Manage student accounts, enrollments, and records."
      />
      <StudentsTable students={students} courses={courses} />
    </>
  );
}
