import { History } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/dal";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { toAttendanceDate } from "./date";
import { MarkAttendanceForm, type RosterRow } from "./mark-attendance-form";
import { MarkFilters } from "./mark-filters";

export const metadata: Metadata = { title: "Mark Attendance" };

export default async function AttendancePage({
  searchParams,
}: PageProps<"/admin/attendance">) {
  await requireAdmin();

  const sp = await searchParams;
  const courseId = typeof sp.courseId === "string" ? sp.courseId : "";
  const date = typeof sp.date === "string" ? sp.date : "";

  const courses = await prisma.course.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const attDate = toAttendanceDate(date);
  let roster: RosterRow[] = [];
  const ready = Boolean(courseId && attDate);

  if (courseId && attDate) {
    const [enrollments, existing] = await Promise.all([
      prisma.enrollment.findMany({
        where: { courseId, status: "ACTIVE" },
        select: {
          student: { select: { id: true, name: true, studentId: true } },
        },
        orderBy: { student: { name: "asc" } },
      }),
      prisma.attendance.findMany({
        where: { courseId, date: attDate },
        select: { studentId: true, status: true },
      }),
    ]);
    const byStudent = new Map(existing.map((a) => [a.studentId, a.status]));
    roster = enrollments.map((e) => ({
      studentId: e.student.id,
      name: e.student.name,
      studentCode: e.student.studentId,
      status: byStudent.get(e.student.id) ?? null,
    }));
  }

  const selectedCourse = courses.find((c) => c.id === courseId);

  return (
    <>
      <PageHeader
        title="Mark Attendance"
        description="Record daily attendance for a course roster."
      >
        <Button
          variant="outline"
          size="sm"
          render={<Link href="/admin/attendance/history" />}
        >
          <History className="mr-2 size-4" />
          History
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
