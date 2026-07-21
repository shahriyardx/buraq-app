import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { requireInstructor } from "@/lib/dal";
import { formatDate } from "@/lib/format";
import { api } from "@/trpc/server";
import { AttendanceFilters } from "./attendance-filters";
import { MarkForm } from "./mark-form";

export const metadata: Metadata = { title: "Attendance" };

export default async function InstructorAttendancePage({
  searchParams,
}: PageProps<"/instructor/attendance">) {
  await requireInstructor();

  const sp = await searchParams;
  const courseId = typeof sp.courseId === "string" ? sp.courseId : "";
  const today = new Date().toISOString().slice(0, 10);
  const date = typeof sp.date === "string" && sp.date ? sp.date : today;

  const courses = await api.instructor.courseOptions();
  const ready = Boolean(courseId && date);
  const roster = ready ? await api.instructor.roster({ courseId, date }) : [];
  const selectedCourse = courses.find((c) => c.id === courseId);

  return (
    <>
      <PageHeader
        title="Attendance"
        description="Mark attendance for your course rosters."
      />

      <Card className="mb-6 p-4">
        <AttendanceFilters courses={courses} courseId={courseId} date={date} />
      </Card>

      {courses.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          You have no active courses to mark attendance for.
        </Card>
      ) : ready ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {selectedCourse?.name ?? "Course"} · {formatDate(date)}
          </p>
          <MarkForm courseId={courseId} date={date} roster={roster} />
        </div>
      ) : (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Choose a course to load the roster.
        </Card>
      )}
    </>
  );
}
