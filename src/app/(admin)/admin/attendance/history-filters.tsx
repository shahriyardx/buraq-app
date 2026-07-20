"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all__";

export type HistoryFilterValues = {
  studentId: string;
  courseId: string;
  from: string;
  to: string;
};

export function HistoryFilters({
  students,
  courses,
  values,
}: {
  students: { id: string; name: string }[];
  courses: { id: string; name: string }[];
  values: HistoryFilterValues;
}) {
  const router = useRouter();
  const [state, setState] = useState(values);

  function apply(next: HistoryFilterValues) {
    setState(next);
    const params = new URLSearchParams();
    if (next.studentId) params.set("studentId", next.studentId);
    if (next.courseId) params.set("courseId", next.courseId);
    if (next.from) params.set("from", next.from);
    if (next.to) params.set("to", next.to);
    const qs = params.toString();
    router.push(
      qs ? `/admin/attendance/history?${qs}` : "/admin/attendance/history",
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="space-y-2 sm:w-56">
        <Label>Student</Label>
        <Select
          value={state.studentId || ALL}
          onValueChange={(v) =>
            apply({
              ...state,
              studentId: (v as string) === ALL ? "" : (v as string),
            })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All students" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All students</SelectItem>
            {students.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2 sm:w-56">
        <Label>Course</Label>
        <Select
          value={state.courseId || ALL}
          onValueChange={(v) =>
            apply({
              ...state,
              courseId: (v as string) === ALL ? "" : (v as string),
            })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All courses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All courses</SelectItem>
            {courses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2 sm:w-40">
        <Label htmlFor="from">From</Label>
        <Input
          id="from"
          type="date"
          value={state.from}
          onChange={(e) => apply({ ...state, from: e.target.value })}
        />
      </div>

      <div className="space-y-2 sm:w-40">
        <Label htmlFor="to">To</Label>
        <Input
          id="to"
          type="date"
          value={state.to}
          onChange={(e) => apply({ ...state, to: e.target.value })}
        />
      </div>

      {(state.studentId || state.courseId || state.from || state.to) && (
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            apply({ studentId: "", courseId: "", from: "", to: "" })
          }
        >
          Clear
        </Button>
      )}
    </div>
  );
}
