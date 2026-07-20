import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { CertificatesTable } from "./certificates-table";

export const metadata: Metadata = { title: "Certificates" };

export default async function CertificatesPage() {
  await requireAdmin();

  const [certificates, students, courses] = await Promise.all([
    prisma.certificate.findMany({
      orderBy: { issuedDate: "desc" },
      include: {
        student: { select: { name: true } },
        course: { select: { name: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: "STUDENT" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, studentId: true },
    }),
    prisma.course.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const rows = certificates.map((c) => ({
    id: c.id,
    certificateId: c.certificateId,
    studentName: c.student.name,
    courseName: c.course.name,
    issuedDate: c.issuedDate.toISOString(),
    status: c.status,
    pdfUrl: c.pdfUrl,
    revokedReason: c.revokedReason,
  }));

  return (
    <>
      <PageHeader
        title="Certificates"
        description="Issue, verify, and revoke completion certificates."
      />
      <CertificatesTable
        certificates={rows}
        students={students}
        courses={courses}
      />
    </>
  );
}
