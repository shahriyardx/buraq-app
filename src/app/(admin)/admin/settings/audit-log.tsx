"use client";

import { type Column, DataTable } from "@/components/data-table";
import { formatDateTime } from "@/lib/format";

export type AuditRow = {
  id: string;
  actorName: string | null;
  action: string;
  entity: string | null;
  detail: string | null;
  ip: string | null;
  createdAt: string;
};

export function AuditLog({ rows }: { rows: AuditRow[] }) {
  const columns: Column<AuditRow>[] = [
    {
      key: "createdAt",
      header: "When",
      render: (r) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {formatDateTime(r.createdAt)}
        </span>
      ),
    },
    {
      key: "actorName",
      header: "Actor",
      render: (r) => r.actorName ?? "—",
    },
    {
      key: "action",
      header: "Action",
      render: (r) => <span className="font-mono text-xs">{r.action}</span>,
    },
    {
      key: "entity",
      header: "Entity",
      render: (r) => r.entity ?? "—",
    },
    {
      key: "detail",
      header: "Detail",
      render: (r) => r.detail ?? "—",
    },
    {
      key: "ip",
      header: "IP",
      render: (r) => <span className="font-mono text-xs">{r.ip ?? "—"}</span>,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      getRowKey={(r) => r.id}
      searchText={(r) =>
        `${r.actorName ?? ""} ${r.action} ${r.entity ?? ""} ${r.detail ?? ""} ${r.ip ?? ""}`
      }
      searchPlaceholder="Search audit log…"
      emptyMessage="No audit records yet."
      csv={{
        filename: "audit-log",
        rows: () =>
          rows.map((r) => ({
            when: formatDateTime(r.createdAt),
            actor: r.actorName ?? "",
            action: r.action,
            entity: r.entity ?? "",
            detail: r.detail ?? "",
            ip: r.ip ?? "",
          })),
      }}
    />
  );
}
