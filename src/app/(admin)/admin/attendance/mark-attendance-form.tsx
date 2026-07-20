"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
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
import { initialActionState } from "@/lib/form";
import { saveAttendanceAction } from "./actions";

export type RosterRow = {
  studentId: string;
  name: string;
  studentCode: string | null;
  status: string | null;
};

const STATUSES = ["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const;

export function MarkAttendanceForm({
  courseId,
  date,
  roster,
}: {
  courseId: string;
  date: string;
  roster: RosterRow[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    saveAttendanceAction,
    initialActionState,
  );

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
      router.refresh();
    } else if (state.status === "error") {
      toast.error(state.message);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="date" value={date} />

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
                  No active students enrolled in this course.
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
                      name={r.studentId}
                      defaultValue={r.status ?? undefined}
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
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save attendance"}
          </Button>
        </div>
      )}
    </form>
  );
}
