"use client";

import { Ban, Copy, Download, MoreHorizontal, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { type Column, DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { initialActionState } from "@/lib/form";
import { formatDate } from "@/lib/format";
import { revokeCertificateAction } from "./actions";
import { CertificateFormDialog } from "./certificate-form-dialog";

export type CertificateRow = {
  id: string;
  certificateId: string;
  studentName: string;
  courseName: string;
  issuedDate: string;
  status: string;
  pdfUrl: string | null;
  revokedReason: string | null;
};

function RevokeDialog({
  certificate,
  open,
  onOpenChange,
}: {
  certificate: CertificateRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const action = revokeCertificateAction.bind(null, certificate.certificateId);
  const [state, formAction, pending] = useActionState(
    action,
    initialActionState,
  );

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
      onOpenChange(false);
      router.refresh();
    } else if (state.status === "error") {
      toast.error(state.message);
    }
  }, [state, router, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Revoke certificate</DialogTitle>
          <DialogDescription>
            Revoke {certificate.certificateId}. The public verification page
            will show it as revoked with the reason below.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              name="reason"
              rows={3}
              placeholder="e.g. Issued in error, course not completed."
              required
            />
          </div>
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "Revoking…" : "Revoke certificate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RowActions({ certificate }: { certificate: CertificateRow }) {
  const [revokeOpen, setRevokeOpen] = useState(false);

  const copyVerifyLink = () => {
    const link = `${window.location.origin}/verify/${certificate.certificateId}`;
    navigator.clipboard.writeText(link).then(
      () => toast.success("Verification link copied."),
      () => toast.error("Could not copy link."),
    );
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          {certificate.pdfUrl && (
            <DropdownMenuItem
              render={
                <Link
                  href={certificate.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                />
              }
            >
              <Download className="mr-2 size-4" /> Download PDF
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={copyVerifyLink}>
            <Copy className="mr-2 size-4" /> Copy verify link
          </DropdownMenuItem>
          {certificate.status === "VALID" && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setRevokeOpen(true)}
              >
                <Ban className="mr-2 size-4" /> Revoke
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <RevokeDialog
        certificate={certificate}
        open={revokeOpen}
        onOpenChange={setRevokeOpen}
      />
    </>
  );
}

export function CertificatesTable({
  certificates,
  students,
  courses,
}: {
  certificates: CertificateRow[];
  students: { id: string; name: string; studentId: string | null }[];
  courses: { id: string; name: string }[];
}) {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const rows = useMemo(
    () =>
      statusFilter === "ALL"
        ? certificates
        : certificates.filter((c) => c.status === statusFilter),
    [certificates, statusFilter],
  );

  const columns: Column<CertificateRow>[] = [
    {
      key: "certificateId",
      header: "Certificate ID",
      render: (c) => (
        <span className="font-mono text-xs">{c.certificateId}</span>
      ),
    },
    { key: "studentName", header: "Student" },
    { key: "courseName", header: "Course" },
    {
      key: "issuedDate",
      header: "Issued",
      render: (c) => formatDate(c.issuedDate),
    },
    {
      key: "status",
      header: "Status",
      render: (c) => <StatusBadge status={c.status} />,
    },
    {
      key: "actions",
      header: "",
      className: "w-12 text-right",
      render: (c) => <RowActions certificate={c} />,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      getRowKey={(c) => c.id}
      searchText={(c) => `${c.certificateId} ${c.studentName} ${c.courseName}`}
      searchPlaceholder="Search certificates…"
      csv={{
        filename: "certificates",
        rows: () =>
          rows.map((c) => ({
            certificate_id: c.certificateId,
            student: c.studentName,
            course: c.courseName,
            issued: formatDate(c.issuedDate),
            status: c.status,
          })),
      }}
      toolbar={
        <>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v ?? "ALL")}
          >
            <SelectTrigger size="sm" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="VALID">Valid</SelectItem>
              <SelectItem value="REVOKED">Revoked</SelectItem>
            </SelectContent>
          </Select>
          <CertificateFormDialog
            students={students}
            courses={courses}
            trigger={
              <Button size="sm">
                <Plus className="mr-2 size-4" />
                Generate certificate
              </Button>
            }
          />
        </>
      }
    />
  );
}
