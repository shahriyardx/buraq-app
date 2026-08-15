import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/dal";
import { CourseCreateForm } from "../course-create-form";

export const metadata: Metadata = { title: "New course" };

export default async function NewCoursePage() {
  await requireAdmin();
  return (
    <>
      <PageHeader
        title="Add course"
        description="Set details, pricing, duration, and weekly training slots."
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/courses">
            <ArrowLeft className="mr-2 size-4" /> Back
          </Link>
        </Button>
      </PageHeader>
      <div className="max-w-3xl">
        <CourseCreateForm />
      </div>
    </>
  );
}
