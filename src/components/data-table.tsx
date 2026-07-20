"use client";

import { Download, Search } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { downloadCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: string;
  className?: string;
  render?: (row: T) => ReactNode;
};

type Props<T> = {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  searchText?: (row: T) => string;
  searchPlaceholder?: string;
  pageSize?: number;
  toolbar?: ReactNode;
  emptyMessage?: string;
  csv?: { filename: string; rows: () => Record<string, unknown>[] };
};

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  searchText,
  searchPlaceholder = "Search…",
  pageSize = 10,
  toolbar,
  emptyMessage = "No records found.",
  csv,
}: Props<T>) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!query.trim() || !searchText) return rows;
    const q = query.toLowerCase();
    return rows.filter((r) => searchText(r).toLowerCase().includes(q));
  }, [rows, query, searchText]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(
    current * pageSize,
    current * pageSize + pageSize,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {searchText && (
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                placeholder={searchPlaceholder}
                className="pl-8"
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {csv && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadCsv(csv.filename, csv.rows())}
            >
              <Download className="mr-2 size-4" />
              Export CSV
            </Button>
          )}
          {toolbar}
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c.key} className={c.className}>
                  {c.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((row) => (
                <TableRow key={getRowKey(row)}>
                  {columns.map((c) => (
                    <TableCell key={c.key} className={cn(c.className)}>
                      {c.render
                        ? c.render(row)
                        : String((row as Record<string, unknown>)[c.key] ?? "")}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {filtered.length > pageSize && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {filtered.length} record{filtered.length === 1 ? "" : "s"} · page{" "}
            {current + 1} of {pageCount}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={current === 0}
              onClick={() => setPage(current - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={current >= pageCount - 1}
              onClick={() => setPage(current + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
