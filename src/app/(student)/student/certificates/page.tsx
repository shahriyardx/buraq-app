import { Award } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { requireStudent } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { CertificatesList } from "./certificates-list";

export const metadata: Metadata = { title: "Certificates" };

export default async function StudentCertificatesPage() {
  const session = await requireStudent();
  const studentId = session.user.id;

  const certificates = await prisma.certificate.findMany({
    where: { studentId },
    include: { course: { select: { name: true } } },
    orderBy: { issuedDate: "desc" },
  });

  const rows = certificates.map((c) => ({
    id: c.id,
    certificateId: c.certificateId,
    courseName: c.course.name,
    issuedDate: c.issuedDate.toISOString(),
    status: c.status,
    pdfUrl: c.pdfUrl,
  }));

  return (
    <>
      <PageHeader
        title="Certificates"
        description="Download your certificates and share verification links."
      />
      {rows.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-lg bg-accent/20 text-accent-foreground">
            <Award className="size-6" />
          </div>
          <div className="space-y-1">
            <p className="font-medium">No certificates yet</p>
            <p className="text-sm text-muted-foreground">
              Certificates appear here once you complete a course.
            </p>
          </div>
        </Card>
      ) : (
        <CertificatesList certificates={rows} />
      )}
    </>
  );
}
