"use client";

import { Pencil } from "lucide-react";
import { type Column, DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { EditAttendanceDialog } from "./edit-attendance-dialog";

export type HistoryRow = {
  id: string;
  date: string;
  studentName: string;
  studentCode: string | null;
  courseName: string;
  status: string;
};

export function HistoryTable({ rows }: { rows: HistoryRow[] }) {
  const columns: Column<HistoryRow>[] = [
    {
      key: "date",
      header: "Date",
      render: (r) => formatDate(r.date),
    },
    {
      key: "student",
      header: "Student",
      render: (r) => (
        <div className="leading-tight">
          <p className="font-medium">{r.studentName}</p>
          <p className="text-xs text-muted-foreground">
            {r.studentCode ?? "—"}
          </p>
        </div>
      ),
    },
    { key: "courseName", header: "Course" },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "actions",
      header: "",
      className: "w-12 text-right",
      render: (r) => (
        <EditAttendanceDialog
          attendanceId={r.id}
          studentName={r.studentName}
          status={r.status}
          trigger={
            <Button variant="ghost" size="icon">
              <Pencil className="size-4" />
            </Button>
          }
        />
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      getRowKey={(r) => r.id}
      searchText={(r) =>
        `${r.studentName} ${r.studentCode ?? ""} ${r.courseName}`
      }
      searchPlaceholder="Search records…"
      emptyMessage="No attendance records match these filters."
      csv={{
        filename: "attendance-history",
        rows: () =>
          rows.map((r) => ({
            date: r.date,
            student: r.studentName,
            student_id: r.studentCode ?? "",
            course: r.courseName,
            status: r.status,
          })),
      }}
    />
  );
}
