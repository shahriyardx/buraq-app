import { BadgeCheck, Download, ShieldAlert, ShieldX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Certificate Verification" };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12 text-foreground">
      <div className="w-full max-w-lg">{children}</div>
    </main>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}

export default async function VerifyCertificatePage({
  params,
}: PageProps<"/verify/[certificateId]">) {
  const { certificateId } = await params;

  const certificate = await prisma.certificate.findUnique({
    where: { certificateId },
    include: {
      student: { select: { name: true } },
      course: { select: { name: true, level: true } },
    },
  });

  const settings = await prisma.schoolSettings.findUnique({
    where: { id: "singleton" },
    select: { name: true },
  });
  const schoolName = settings?.name ?? "Buraq Horse Riding School";

  if (!certificate) {
    return (
      <Shell>
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300">
            <ShieldX className="size-7" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-red-700 dark:text-red-300">
            Invalid Certificate
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            No certificate matches this reference. Please check the ID and try
            again.
          </p>
          <p className="mt-4 font-mono text-xs text-muted-foreground">
            {certificateId}
          </p>
        </div>
      </Shell>
    );
  }

  const isRevoked = certificate.status === "REVOKED";

  return (
    <Shell>
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-primary px-8 py-6 text-center text-primary-foreground">
          <p className="text-sm tracking-wide opacity-90">{schoolName}</p>
          <p className="mt-1 text-xs uppercase tracking-widest opacity-70">
            Certificate Verification
          </p>
        </div>

        <div className="p-8">
          {isRevoked ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                <ShieldAlert className="size-7" />
              </div>
              <h1 className="font-heading text-2xl font-bold text-red-700 dark:text-red-300">
                Certificate Revoked
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                This certificate is no longer valid.
              </p>
              {certificate.revokedReason && (
                <p className="mx-auto mt-4 max-w-sm rounded-lg bg-muted px-4 py-3 text-sm">
                  <span className="font-medium">Reason:</span>{" "}
                  {certificate.revokedReason}
                </p>
              )}
            </div>
          ) : (
            <div className="text-center">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                <BadgeCheck className="size-7" />
              </div>
              <h1 className="font-heading text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                Valid Certificate
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                This certificate is authentic and issued by {schoolName}.
              </p>
            </div>
          )}

          <div className="mt-8">
            <DetailRow label="Student" value={certificate.student.name} />
            <DetailRow
              label="Course"
              value={
                certificate.course.level
                  ? `${certificate.course.name} (${certificate.course.level})`
                  : certificate.course.name
              }
            />
            <DetailRow
              label="Certificate ID"
              value={
                <span className="font-mono text-xs">
                  {certificate.certificateId}
                </span>
              }
            />
            <DetailRow
              label="Issued"
              value={formatDate(certificate.issuedDate)}
            />
          </div>

          {!isRevoked && certificate.pdfUrl && (
            <div className="mt-6 flex justify-center">
              <Link
                href={certificate.pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
              >
                <Download className="size-4" />
                Download certificate
              </Link>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
