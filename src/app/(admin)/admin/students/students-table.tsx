"use client";

import { MoreHorizontal, Plus, UserCheck, UserX } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { type Column, DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/format";
import { createStudentAction, setStudentStatusAction } from "./actions";
import { BulkImportDialog } from "./bulk-import-dialog";
import { StudentFormDialog } from "./student-form-dialog";

export type StudentRow = {
  id: string;
  name: string;
  email: string;
  studentId: string | null;
  phone: string | null;
  status: string;
  coursesCount: number;
  photoUrl: string | null;
};

function RowActions({ student }: { student: StudentRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const nextStatus = student.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" disabled={pending}>
            <MoreHorizontal className="size-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          render={<Link href={`/admin/students/${student.id}`} />}
        >
          View profile
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            startTransition(async () => {
              await setStudentStatusAction(student.id, nextStatus);
              toast.success(
                nextStatus === "ACTIVE"
                  ? "Student activated."
                  : "Student deactivated.",
              );
              router.refresh();
            })
          }
        >
          {nextStatus === "ACTIVE" ? (
            <>
              <UserCheck className="mr-2 size-4" /> Activate
            </>
          ) : (
            <>
              <UserX className="mr-2 size-4" /> Deactivate
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function StudentsTable({
  students,
  courses,
}: {
  students: StudentRow[];
  courses: { id: string; name: string }[];
}) {
  const columns: Column<StudentRow>[] = [
    {
      key: "name",
      header: "Student",
      render: (s) => (
        <div className="flex items-center gap-3">
          <Avatar className="size-9">
            {s.photoUrl && <AvatarImage src={s.photoUrl} alt={s.name} />}
            <AvatarFallback className="bg-primary/10 text-xs text-primary">
              {initials(s.name)}
            </AvatarFallback>
          </Avatar>
          <div className="leading-tight">
            <p className="font-medium">{s.name}</p>
            <p className="text-xs text-muted-foreground">
              {s.studentId ?? "—"}
            </p>
          </div>
        </div>
      ),
    },
    { key: "email", header: "Email" },
    { key: "phone", header: "Phone", render: (s) => s.phone ?? "—" },
    {
      key: "coursesCount",
      header: "Courses",
      className: "text-center",
      render: (s) => <span className="tabular-nums">{s.coursesCount}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (s) => <StatusBadge status={s.status} />,
    },
    {
      key: "actions",
      header: "",
      className: "w-12 text-right",
      render: (s) => <RowActions student={s} />,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={students}
      getRowKey={(s) => s.id}
      searchText={(s) => `${s.name} ${s.email} ${s.studentId ?? ""}`}
      searchPlaceholder="Search students…"
      csv={{
        filename: "students",
        rows: () =>
          students.map((s) => ({
            student_id: s.studentId ?? "",
            name: s.name,
            email: s.email,
            phone: s.phone ?? "",
            courses: s.coursesCount,
            status: s.status,
          })),
      }}
      toolbar={
        <>
          <BulkImportDialog />
          <StudentFormDialog
            mode="create"
            action={createStudentAction}
            courses={courses}
            trigger={
              <Button size="sm">
                <Plus className="mr-2 size-4" />
                Add student
              </Button>
            }
          />
        </>
      }
    />
  );
}
