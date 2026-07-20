"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { type Column, DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type TicketRow = {
  id: string;
  ticketId: string;
  subject: string;
  studentName: string;
  studentId: string | null;
  category: string;
  status: string;
  messagesCount: number;
};

const STATUS_FILTERS = [
  { value: "ALL", label: "All statuses" },
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "RESOLVED", label: "Resolved" },
];

function label(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, " ");
}

export function TicketsTable({ tickets }: { tickets: TicketRow[] }) {
  const [status, setStatus] = useState("ALL");

  const rows = useMemo(
    () =>
      status === "ALL" ? tickets : tickets.filter((t) => t.status === status),
    [tickets, status],
  );

  const columns: Column<TicketRow>[] = [
    {
      key: "ticketId",
      header: "Ticket ID",
      render: (t) => <span className="font-mono text-xs">{t.ticketId}</span>,
    },
    {
      key: "subject",
      header: "Subject",
      render: (t) => <span className="font-medium">{t.subject}</span>,
    },
    {
      key: "student",
      header: "Student",
      render: (t) => (
        <div className="leading-tight">
          <p>{t.studentName}</p>
          <p className="text-xs text-muted-foreground">{t.studentId ?? "—"}</p>
        </div>
      ),
    },
    { key: "category", header: "Category", render: (t) => label(t.category) },
    {
      key: "messagesCount",
      header: "Messages",
      className: "text-center",
      render: (t) => <span className="tabular-nums">{t.messagesCount}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (t) => <StatusBadge status={t.status} />,
    },
    {
      key: "actions",
      header: "",
      className: "w-16 text-right",
      render: (t) => (
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/admin/support/${t.id}`}>View</Link>
        </Button>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      getRowKey={(t) => t.id}
      searchText={(t) => `${t.subject} ${t.studentName} ${t.ticketId}`}
      searchPlaceholder="Search tickets…"
      csv={{
        filename: "tickets",
        rows: () =>
          rows.map((t) => ({
            ticket_id: t.ticketId,
            subject: t.subject,
            student: t.studentName,
            category: t.category,
            messages: t.messagesCount,
            status: t.status,
          })),
      }}
      toolbar={
        <Select value={status} onValueChange={(v) => setStatus(v ?? "ALL")}>
          <SelectTrigger size="sm" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    />
  );
}
