import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { CoursesTable } from "./courses-table";
import { PendingEnrollments } from "./pending-enrollments";

export const metadata: Metadata = { title: "Courses" };

export default async function CoursesPage() {
  await requireAdmin();

  const pending = await prisma.enrollment.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: {
      student: { select: { name: true } },
      course: { select: { name: true } },
    },
  });
  const pendingItems = pending.map((e) => ({
    id: e.id,
    studentName: e.student.name,
    courseName: e.course.name,
    requestedAt: e.createdAt.toISOString(),
  }));

  const courses = await prisma.course.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      level: true,
      durationWeeks: true,
      price: true,
      schedule: true,
      maxStudents: true,
      instructor: true,
      status: true,
      _count: { select: { enrollments: true } },
    },
  });

  const rows = courses.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    level: c.level,
    durationWeeks: c.durationWeeks,
    price: c.price.toString(),
    schedule: c.schedule,
    maxStudents: c.maxStudents,
    instructor: c.instructor,
    status: c.status,
    enrolledCount: c._count.enrollments,
  }));

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
