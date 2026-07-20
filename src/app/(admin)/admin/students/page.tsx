import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { StudentsTable } from "./students-table";

export const metadata: Metadata = { title: "Students" };

export default async function StudentsPage() {
  await requireAdmin();

  const [students, courses] = await Promise.all([
    prisma.user.findMany({
      where: { role: "STUDENT" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        studentId: true,
        phone: true,
        status: true,
        photoUrl: true,
        _count: { select: { enrollments: true } },
      },
    }),
    prisma.course.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const rows = students.map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    studentId: s.studentId,
    phone: s.phone,
    status: s.status,
    photoUrl: s.photoUrl,
    coursesCount: s._count.enrollments,
  }));

  return (
    <>
      <PageHeader
        title="Students"
        description="Manage student accounts, enrollments, and records."
      />
      <StudentsTable students={rows} courses={courses} />
    </>
  );
}
