"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/trpc/client";

export type RosterRow = {
  studentId: string;
  name: string;
  studentCode: string | null;
  status: string | null;
};

const STATUSES = ["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const;
type Status = (typeof STATUSES)[number];

export function MarkForm({
  courseId,
  date,
  roster,
}: {
  courseId: string;
  date: string;
  roster: RosterRow[];
}) {
  const router = useRouter();
  const [marks, setMarks] = useState<Record<string, Status>>(() => {
    const initial: Record<string, Status> = {};
    for (const r of roster) {
      if (r.status && (STATUSES as readonly string[]).includes(r.status)) {
        initial[r.studentId] = r.status as Status;
      }
    }
    return initial;
  });

  const save = trpc.instructor.saveAttendance.useMutation();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const entries = Object.entries(marks).map(([studentId, status]) => ({
      studentId,
      status,
    }));
    try {
      const res = await save.mutateAsync({ courseId, date, entries });
      toast.success(
        res.changed
          ? `Saved ${res.changed} attendance record${res.changed === 1 ? "" : "s"}.`
          : "No changes to save.",
      );
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead className="w-56">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roster.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={2}
                  className="h-24 text-center text-muted-foreground"
                >
                  No active riders enrolled in this course.
                </TableCell>
              </TableRow>
            ) : (
              roster.map((r) => (
                <TableRow key={r.studentId}>
                  <TableCell>
                    <div className="leading-tight">
                      <p className="font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.studentCode ?? "—"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={marks[r.studentId] ?? ""}
                      onValueChange={(value) =>
                        setMarks((prev) => ({
                          ...prev,
                          [r.studentId]: value as Status,
                        }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Not marked" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s.charAt(0) + s.slice(1).toLowerCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {roster.length > 0 && (
        <div className="flex justify-end">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save attendance"}
          </Button>
        </div>
      )}
    </form>
  );
}
