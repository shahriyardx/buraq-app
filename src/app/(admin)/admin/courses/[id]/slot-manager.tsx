"use client";

import { CalendarPlus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/trpc/client";

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export type SlotRow = {
  id: string;
  weekday: number;
  startTime: string;
  endTime: string;
  sessionMinutes: number;
  capacity: number;
  bookingCount: number;
};

function AddSlotDialog({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [weekday, setWeekday] = useState("1");
  const [startTime, setStartTime] = useState("16:00");
  const [endTime, setEndTime] = useState("19:00");
  const [sessionMinutes, setSessionMinutes] = useState("30");
  const add = trpc.courses.addSlot.useMutation();

  async function submit() {
    try {
      await add.mutateAsync({
        courseId,
        weekday: Number(weekday),
        startTime,
        endTime,
        sessionMinutes: Math.max(5, Number(sessionMinutes) || 30),
        capacity: 1,
      });
      toast.success("Slot added.");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <CalendarPlus className="mr-2 size-4" /> Add slot
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add training slot</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field className="col-span-2">
            <FieldLabel>Day</FieldLabel>
            <Select value={weekday} onValueChange={setWeekday}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {WEEKDAYS[d]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Start</FieldLabel>
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel>End</FieldLabel>
            <Input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </Field>
          <Field className="col-span-2">
            <FieldLabel>Minutes per session</FieldLabel>
            <Input
              type="number"
              min={5}
              value={sessionMinutes}
              onChange={(e) => setSessionMinutes(e.target.value)}
            />
          </Field>
        </div>
        <DialogFooter className="mt-4">
          <Button onClick={submit} disabled={add.isPending}>
            {add.isPending ? "Adding…" : "Add slot"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteSlot({
  id,
  bookingCount,
}: {
  id: string;
  bookingCount: number;
}) {
  const router = useRouter();
  const del = trpc.courses.deleteSlot.useMutation();
  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={del.isPending}
      onClick={async () => {
        if (
          bookingCount > 0 &&
          !window.confirm(
            `This slot has ${bookingCount} booking(s). Deleting removes them. Continue?`,
          )
        )
          return;
        await del.mutateAsync({ id });
        toast.success("Slot removed.");
        router.refresh();
      }}
    >
      <Trash2 className="size-4 text-destructive" />
    </Button>
  );
}

export function SlotManager({
  courseId,
  slots,
}: {
  courseId: string;
  slots: SlotRow[];
}) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="font-semibold">Training slots</p>
          <p className="text-sm text-muted-foreground">
            Weekly windows students can book. Seats = capacity per week.
          </p>
        </div>
        <AddSlotDialog courseId={courseId} />
      </div>
      {slots.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No training slots yet.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {slots.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-4 py-2.5 text-sm"
            >
              <span>
                <span className="font-medium">{WEEKDAYS[s.weekday]}</span>
                <span className="text-muted-foreground">
                  {" · "}
                  {s.startTime}–{s.endTime} · {s.sessionMinutes}min sessions
                </span>
              </span>
              <DeleteSlot id={s.id} bookingCount={s.bookingCount} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
