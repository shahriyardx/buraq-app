import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/dal";
import { api } from "@/trpc/server";
import { InstructorsTable } from "./instructors-table";

export const metadata: Metadata = { title: "Instructors" };

export default async function InstructorsPage() {
  await requireAdmin();
  const instructors = await api.instructors.list();

  return (
    <>
      <PageHeader
        title="Instructors"
        description="Manage instructor accounts, profiles, and course assignments."
      />
      <InstructorsTable instructors={instructors} />
    </>
  );
}
