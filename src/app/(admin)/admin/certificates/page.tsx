import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/dal";
import { api } from "@/trpc/server";
import { CertificatesTable } from "./certificates-table";

export const metadata: Metadata = { title: "Certificates" };

export default async function CertificatesPage() {
  await requireAdmin();

  const [certificates, students, courses] = await Promise.all([
    api.certificates.list(),
    api.certificates.studentOptions(),
    api.certificates.courseOptions(),
  ]);

  const rows = certificates.map((c) => ({
    id: c.id,
    certificateId: c.certificateId,
    studentName: c.studentName,
    courseName: c.courseName,
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
