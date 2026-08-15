"use client";

import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/trpc/client";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const ASSIGN = "__assign__";

export function SlotCalendar({
  courses,
  initialCourseId,
  initialYear,
  initialMonth,
}: {
  courses: { id: string; name: string }[];
  initialCourseId: string;
  initialYear: number;
  initialMonth: number; // 1-12
}) {
  const [courseId, setCourseId] = useState(initialCourseId);
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [selected, setSelected] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const cal = trpc.courses.calendar.useQuery(
    { courseId, year, month },
    { enabled: Boolean(courseId) },
  );
  const assign = trpc.courses.assignSlot.useMutation();
  const remove = trpc.courses.removeBooking.useMutation();

  const byDate = useMemo(() => {
    type DaySlots = NonNullable<typeof cal.data>["days"][number]["slots"];
    const m = new Map<string, DaySlots>();
    for (const d of cal.data?.days ?? []) m.set(d.date, d.slots);
    return m;
  }, [cal.data]);

  function shiftMonth(delta: number) {
    let y = year;
    let mo = month + delta;
    if (mo < 1) {
      mo = 12;
      y -= 1;
    } else if (mo > 12) {
      mo = 1;
      y += 1;
    }
    setYear(y);
    setMonth(mo);
    setSelected(null);
  }

  async function refresh() {
    await utils.courses.calendar.invalidate({ courseId, year, month });
  }

  async function doAssign(slotId: string, date: string, studentId: string) {
    try {
      await assign.mutateAsync({ slotId, date, studentId });
      toast.success("Slot assigned.");
      await refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }
  async function doRemove(id: string) {
    try {
      await remove.mutateAsync({ id });
      toast.success("Booking removed.");
      await refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  // Month grid: Monday-first.
  const firstDow = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const pads = Array.from({ length: firstDow }, (_, i) => `pad-${i + 1}`);
  const dayNums = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const selectedSlots = selected ? (byDate.get(selected) ?? []) : [];
  const students = cal.data?.enrolledStudents ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Select
            value={courseId}
            onValueChange={(v) => {
              setCourseId(v);
              setSelected(null);
            }}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Select course" />
            </SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => shiftMonth(-1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-40 text-center font-medium">
              {MONTHS[month - 1]} {year}
            </span>
            <Button variant="outline" size="icon" onClick={() => shiftMonth(1)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
          {DOW.map((d) => (
            <div key={d} className="py-1 font-medium">
              {d}
            </div>
          ))}
          {pads.map((p) => (
            <div key={p} className="aspect-square" />
          ))}
          {dayNums.map((d) => {
            const dk = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const slots = byDate.get(dk);
            const booked =
              slots?.reduce((n, s) => n + s.bookings.length, 0) ?? 0;
            const cap = slots?.reduce((n, s) => n + s.capacity, 0) ?? 0;
            const has = Boolean(slots?.length);
            const isSel = selected === dk;
            return (
              <button
                type="button"
                key={dk}
                disabled={!has}
                onClick={() => setSelected(dk)}
                className={[
                  "flex aspect-square flex-col items-center justify-center rounded-md border text-sm transition-colors",
                  isSel
                    ? "border-primary bg-primary/10"
                    : has
                      ? "border-border hover:bg-muted"
                      : "border-transparent text-muted-foreground/50",
                ].join(" ")}
              >
                <span>{d}</span>
                {has && (
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    {booked}/{cap}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="h-fit p-5">
        <p className="font-semibold">
          {selected ? formatDay(selected) : "Pick a date"}
        </p>
        <p className="mb-3 text-sm text-muted-foreground">
          {selected
            ? "Slots for this date. Assign or remove students."
            : "Days with training slots are selectable."}
        </p>

        {selected && selectedSlots.length === 0 && (
          <p className="text-sm text-muted-foreground">No slots this day.</p>
        )}

        <div className="space-y-4">
          {selectedSlots.map((s) => {
            const remaining = s.capacity - s.bookings.length;
            const bookedIds = new Set(s.bookings.map((b) => b.studentId));
            const assignable = students.filter((st) => !bookedIds.has(st.id));
            return (
              <div key={s.slotId} className="rounded-lg border p-3">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium">
                    {s.startTime}–{s.endTime}
                  </span>
                  <span className="text-muted-foreground">
                    {s.bookings.length}/{s.capacity} · {remaining} left
                  </span>
                </div>
                <ul className="space-y-1">
                  {s.bookings.map((b) => (
                    <li
                      key={b.bookingId}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span>{b.studentName}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={remove.isPending}
                        onClick={() => doRemove(b.bookingId)}
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    </li>
                  ))}
                </ul>
                {remaining > 0 && assignable.length > 0 && (
                  <Select
                    value={ASSIGN}
                    onValueChange={(v) => {
                      if (v !== ASSIGN && selected)
                        doAssign(s.slotId, selected, v);
                    }}
                  >
                    <SelectTrigger className="mt-2 h-9">
                      <SelectValue placeholder="Assign student…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ASSIGN}>Assign student…</SelectItem>
                      {assignable.map((st) => (
                        <SelectItem key={st.id} value={st.id}>
                          {st.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function formatDay(dk: string) {
  const d = new Date(`${dk}T00:00:00.000Z`);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
