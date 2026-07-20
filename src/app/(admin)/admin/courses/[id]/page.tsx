import { Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/dal";
import { formatCurrency, formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { updateCourseAction } from "../actions";
import { CourseFormDialog } from "../course-form-dialog";
import { EnrollStudentDialog } from "./enroll-student-dialog";

export const metadata: Metadata = { title: "Course detail" };

export default async function CourseDetailPage({
  params,
}: PageProps<"/admin/courses/[id]">) {
  await requireAdmin();
  const { id } = await params;

  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      enrollments: {
        include: { student: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!course) notFound();

  const enrolledIds = new Set(course.enrollments.map((e) => e.studentId));
  const students = await prisma.user.findMany({
    where: { role: "STUDENT", status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  const available = students.filter((s) => !enrolledIds.has(s.id));

  const info: [string, string][] = [
    ["Level", course.level ?? "—"],
    ["Instructor", course.instructor ?? "—"],
    [
      "Duration",
      course.durationWeeks != null ? `${course.durationWeeks} wks` : "—",
    ],
    ["Price", formatCurrency(course.price)],
    ["Schedule", course.schedule ?? "—"],
    [
      "Enrolled",
      `${course.enrollments.length}${course.maxStudents != null ? ` / ${course.maxStudents}` : ""}`,
    ],
    ["Created", formatDate(course.createdAt)],
  ];

  return (
    <>
      <PageHeader
        title={course.name}
        description={course.description ?? "Course details."}
      >
        <StatusBadge status={course.status} />
        <CourseFormDialog
          mode="edit"
          action={updateCourseAction.bind(null, course.id)}
          course={{
            id: course.id,
            name: course.name,
            description: course.description,
            level: course.level,
            durationWeeks: course.durationWeeks,
            price: course.price.toString(),
            maxStudents: course.maxStudents,
            instructor: course.instructor,
            schedule: course.schedule,
          }}
          trigger={
            <Button variant="outline" size="sm">
              <Pencil className="mr-2 size-4" /> Edit
            </Button>
          }
        />
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="h-fit p-6">
          <dl className="space-y-3 text-sm">
            {info.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-right font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold">
              Enrolled students
            </h2>
            <EnrollStudentDialog courseId={course.id} students={available} />
          </div>
          <Card className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {course.enrollments.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="h-20 text-center text-muted-foreground"
                    >
                      No students enrolled yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  course.enrollments.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/admin/students/${e.student.id}`}
                          className="hover:underline"
                        >
                          {e.student.name}
                        </Link>
                      </TableCell>
                      <TableCell>{e.progress}%</TableCell>
                      <TableCell>
                        <StatusBadge status={e.status} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>
    </>
  );
}
