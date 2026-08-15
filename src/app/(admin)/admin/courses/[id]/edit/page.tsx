import { TRPCError } from "@trpc/server";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/dal";
import { api } from "@/trpc/server";
import { CourseEditForm } from "../../course-edit-form";
import { SlotManager } from "../slot-manager";

export const metadata: Metadata = { title: "Edit course" };

export default async function EditCoursePage({
  params,
}: PageProps<"/admin/courses/[id]/edit">) {
  await requireAdmin();
  const { id } = await params;

  const course = await api.courses.get({ id }).catch((err) => {
    if (err instanceof TRPCError && err.code === "NOT_FOUND") notFound();
    throw err;
  });
  const slots = await api.courses.slots({ courseId: id });

  return (
    <>
      <PageHeader
        title={`Edit ${course.name}`}
        description="Update details, pricing, and training days & slots."
      >
        <StatusBadge status={course.status} />
        <Button variant="outline" size="sm" asChild>
          <Link href={`/admin/courses/${id}`}>
            <ArrowLeft className="mr-2 size-4" /> Back
          </Link>
        </Button>
      </PageHeader>

      <div className="max-w-3xl space-y-6">
        <CourseEditForm
          course={{
            id: course.id,
            name: course.name,
            description: course.description,
            level: course.level,
            durationWeeks: course.durationWeeks,
            price: course.price,
            maxBookingsPerWeek: course.maxBookingsPerWeek,
            enrollmentPaused: course.enrollmentPaused,
            instructorUserId: course.instructorUserId,
            schedule: course.schedule,
          }}
        />

        <SlotManager courseId={course.id} slots={slots} />
      </div>
    </>
  );
}
