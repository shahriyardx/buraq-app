"use client";

import { Copy, Download } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { type Column, DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";

export type CertificateRow = {
  id: string;
  certificateId: string;
  courseName: string;
  issuedDate: string;
  status: string;
  pdfUrl: string | null;
};

function RowActions({ certificate }: { certificate: CertificateRow }) {
  const share = () => {
    const link = `${window.location.origin}/verify/${certificate.certificateId}`;
    navigator.clipboard.writeText(link).then(
      () => toast.success("Link copied"),
      () => toast.error("Could not copy link."),
    );
  };

  return (
    <div className="flex items-center justify-end gap-2">
      {certificate.pdfUrl ? (
        <Button
          variant="outline"
          size="sm"
          render={
            <Link href={certificate.pdfUrl} target="_blank" rel="noreferrer" />
          }
        >
          <Download className="mr-2 size-4" /> Download
        </Button>
      ) : (
        <span className="text-xs text-muted-foreground">PDF unavailable</span>
      )}
      <Button variant="ghost" size="sm" onClick={share}>
        <Copy className="mr-2 size-4" /> Share
      </Button>
    </div>
  );
}

export function CertificatesList({
  certificates,
}: {
  certificates: CertificateRow[];
}) {
  const columns: Column<CertificateRow>[] = [
    { key: "courseName", header: "Course" },
    {
      key: "issuedDate",
      header: "Issued",
      render: (c) => formatDate(c.issuedDate),
    },
    {
      key: "certificateId",
      header: "Certificate ID",
      render: (c) => (
        <span className="font-mono text-xs">{c.certificateId}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (c) => <StatusBadge status={c.status} />,
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (c) => <RowActions certificate={c} />,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={certificates}
      getRowKey={(c) => c.id}
      searchText={(c) => `${c.courseName} ${c.certificateId}`}
      searchPlaceholder="Search certificates…"
      emptyMessage="No certificates found."
      csv={{
        filename: "certificates",
        rows: () =>
          certificates.map((c) => ({
            course: c.courseName,
            issued: formatDate(c.issuedDate),
            certificate_id: c.certificateId,
            status: c.status,
          })),
      }}
    />
  );
}
