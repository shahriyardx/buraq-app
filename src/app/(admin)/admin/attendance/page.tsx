import { History } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/dal";
import { formatDate } from "@/lib/format";
import { api } from "@/trpc/server";
import { toAttendanceDate } from "./date";
import { MarkAttendanceForm } from "./mark-attendance-form";
import { MarkFilters } from "./mark-filters";

export const metadata: Metadata = { title: "Mark Attendance" };

export default async function AttendancePage({
  searchParams,
}: PageProps<"/admin/attendance">) {
  await requireAdmin();

  const sp = await searchParams;
  const courseId = typeof sp.courseId === "string" ? sp.courseId : "";
  const date = typeof sp.date === "string" ? sp.date : "";

  const courses = await api.attendance.courseOptions();

  const ready = Boolean(courseId && toAttendanceDate(date));
  const roster = ready ? await api.attendance.roster({ courseId, date }) : [];

  const selectedCourse = courses.find((c) => c.id === courseId);

  return (
    <>
      <PageHeader
        title="Mark Attendance"
        description="Record daily attendance for a course roster."
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/attendance/history">
            <History className="mr-2 size-4" />
            History
          </Link>
        </Button>
      </PageHeader>

      <Card className="mb-6 p-4">
        <MarkFilters courses={courses} courseId={courseId} date={date} />
      </Card>

      {ready ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {selectedCourse?.name ?? "Course"} · {formatDate(date)}
          </p>
          <MarkAttendanceForm courseId={courseId} date={date} roster={roster} />
        </div>
      ) : (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Choose a course and date to load the roster.
        </Card>
      )}
    </>
  );
}
