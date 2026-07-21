"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AttendanceFilters({
  courses,
  courseId,
  date,
}: {
  courses: { id: string; name: string }[];
  courseId: string;
  date: string;
}) {
  const router = useRouter();
  const [course, setCourse] = useState(courseId);
  const [day, setDay] = useState(date);

  function push(nextCourse: string, nextDay: string) {
    const params = new URLSearchParams();
    if (nextCourse) params.set("courseId", nextCourse);
    if (nextDay) params.set("date", nextDay);
    router.push(`/instructor/attendance?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="space-y-2 sm:w-64">
        <Label>Course</Label>
        <Select
          value={course || undefined}
          onValueChange={(value) => {
            setCourse(value);
            push(value, day);
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a course" />
          </SelectTrigger>
          <SelectContent>
            {courses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2 sm:w-48">
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          type="date"
          value={day}
          onChange={(e) => {
            setDay(e.target.value);
            push(course, e.target.value);
          }}
        />
      </div>
    </div>
  );
}
