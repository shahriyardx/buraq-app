"use client";

import { MoreHorizontal, Plus, UserCheck, UserX } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { trpc } from "@/trpc/client";
import { InstructorFormDialog } from "./instructor-form-dialog";

export type InstructorRow = {
  id: string;
  name: string;
  email: string;
  instructorId: string | null;
  phone: string | null;
  specialties: string | null;
  status: string;
  coursesCount: number;
  photoUrl: string | null;
};

function RowActions({ instructor }: { instructor: InstructorRow }) {
  const router = useRouter();
  const setStatus = trpc.instructors.setStatus.useMutation();
  const nextStatus = instructor.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={setStatus.isPending}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/admin/instructors/${instructor.id}`}>View profile</Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={async () => {
            await setStatus.mutateAsync({
              id: instructor.id,
              status: nextStatus,
            });
            toast.success(
              nextStatus === "ACTIVE"
                ? "Instructor activated."
                : "Instructor deactivated.",
            );
            router.refresh();
          }}
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

export function InstructorsTable({
  instructors,
}: {
  instructors: InstructorRow[];
}) {
  const columns: Column<InstructorRow>[] = [
    {
      key: "name",
      header: "Instructor",
      render: (i) => (
        <div className="flex items-center gap-3">
          <Avatar className="size-9">
            {i.photoUrl && <AvatarImage src={i.photoUrl} alt={i.name} />}
            <AvatarFallback className="bg-primary/10 text-xs text-primary">
              {initials(i.name)}
            </AvatarFallback>
          </Avatar>
          <div className="leading-tight">
            <p className="font-medium">{i.name}</p>
            <p className="text-xs text-muted-foreground">
              {i.instructorId ?? "—"}
            </p>
          </div>
        </div>
      ),
    },
    { key: "email", header: "Email" },
    {
      key: "specialties",
      header: "Specialties",
      render: (i) => i.specialties ?? "—",
    },
    {
      key: "coursesCount",
      header: "Courses",
      className: "text-center",
      render: (i) => <span className="tabular-nums">{i.coursesCount}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (i) => <StatusBadge status={i.status} />,
    },
    {
      key: "actions",
      header: "",
      className: "w-12 text-right",
      render: (i) => <RowActions instructor={i} />,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={instructors}
      getRowKey={(i) => i.id}
      searchText={(i) =>
        `${i.name} ${i.email} ${i.instructorId ?? ""} ${i.specialties ?? ""}`
      }
      searchPlaceholder="Search instructors…"
      csv={{
        filename: "instructors",
        rows: () =>
          instructors.map((i) => ({
            instructor_id: i.instructorId ?? "",
            name: i.name,
            email: i.email,
            phone: i.phone ?? "",
            specialties: i.specialties ?? "",
            courses: i.coursesCount,
            status: i.status,
          })),
      }}
      toolbar={
        <InstructorFormDialog
          mode="create"
          trigger={
            <Button size="sm">
              <Plus className="mr-2 size-4" />
              Add instructor
            </Button>
          }
        />
      }
    />
  );
}
