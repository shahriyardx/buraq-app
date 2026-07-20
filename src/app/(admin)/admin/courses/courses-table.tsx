"use client";

import {
  Archive,
  ArchiveRestore,
  MoreHorizontal,
  Pencil,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { type Column, DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/format";
import {
  createCourseAction,
  setCourseStatusAction,
  updateCourseAction,
} from "./actions";
import { CourseFormDialog } from "./course-form-dialog";

export type CourseRow = {
  id: string;
  name: string;
  level: string | null;
  description: string | null;
  durationWeeks: number | null;
  price: string;
  schedule: string | null;
  maxStudents: number | null;
  instructor: string | null;
  status: string;
  enrolledCount: number;
};

function RowActions({ course }: { course: CourseRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const nextStatus = course.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE";

  return (
    <>
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
            render={<Link href={`/admin/courses/${course.id}`} />}
          >
            View
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 size-4" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              startTransition(async () => {
                await setCourseStatusAction(course.id, nextStatus);
                toast.success(
                  nextStatus === "ACTIVE"
                    ? "Course activated."
                    : "Course archived.",
                );
                router.refresh();
              })
            }
          >
            {nextStatus === "ACTIVE" ? (
              <>
                <ArchiveRestore className="mr-2 size-4" /> Activate
              </>
            ) : (
              <>
                <Archive className="mr-2 size-4" /> Archive
              </>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CourseFormDialog
        mode="edit"
        action={updateCourseAction.bind(null, course.id)}
        open={editOpen}
        onOpenChange={setEditOpen}
        course={{
          id: course.id,
          name: course.name,
          description: course.description,
          level: course.level,
          durationWeeks: course.durationWeeks,
          price: course.price,
          maxStudents: course.maxStudents,
          instructor: course.instructor,
          schedule: course.schedule,
        }}
      />
    </>
  );
}

export function CoursesTable({ courses }: { courses: CourseRow[] }) {
  const columns: Column<CourseRow>[] = [
    {
      key: "name",
      header: "Name",
      render: (c) => (
        <div className="leading-tight">
          <p className="font-medium">{c.name}</p>
          <p className="text-xs text-muted-foreground">{c.level ?? "—"}</p>
        </div>
      ),
    },
    {
      key: "durationWeeks",
      header: "Duration",
      render: (c) => (c.durationWeeks != null ? `${c.durationWeeks} wks` : "—"),
    },
    {
      key: "price",
      header: "Price",
      render: (c) => formatCurrency(c.price),
    },
    {
      key: "enrolled",
      header: "Enrolled",
      className: "text-center",
      render: (c) => (
        <span className="tabular-nums">
          {c.enrolledCount}
          {c.maxStudents != null ? ` / ${c.maxStudents}` : ""}
        </span>
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
      className: "w-12 text-right",
      render: (c) => <RowActions course={c} />,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={courses}
      getRowKey={(c) => c.id}
      searchText={(c) => `${c.name} ${c.level ?? ""} ${c.instructor ?? ""}`}
      searchPlaceholder="Search courses…"
      csv={{
        filename: "courses",
        rows: () =>
          courses.map((c) => ({
            name: c.name,
            level: c.level ?? "",
            duration_weeks: c.durationWeeks ?? "",
            price: c.price,
            enrolled: c.enrolledCount,
            max_students: c.maxStudents ?? "",
            instructor: c.instructor ?? "",
            status: c.status,
          })),
      }}
      toolbar={
        <CourseFormDialog
          mode="create"
          action={createCourseAction}
          trigger={
            <Button size="sm">
              <Plus className="mr-2 size-4" />
              Add course
            </Button>
          }
        />
      }
    />
  );
}
