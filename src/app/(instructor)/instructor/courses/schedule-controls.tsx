"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/trpc/client";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SEATS = Array.from({ length: 10 }, (_, i) => String(i + 1));

/**
 * Seats-per-session picker for a list of slots, plus the live toggle when
 * given a course (shared slots have no course and no toggle).
 */
export function ScheduleControls({
  courseId,
  live,
  slots,
}: {
  courseId?: string;
  live?: boolean;
  slots: {
    id: string;
    weekday: number;
    startTime: string;
    endTime: string;
    capacity: number;
  }[];
}) {
  const router = useRouter();
  const setLive = trpc.instructor.setScheduleLive.useMutation();
  const setSeats = trpc.instructor.setSlotCapacity.useMutation();

  async function run(fn: () => Promise<unknown>, ok: string) {
    try {
      await fn();
      toast.success(ok);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="space-y-2 border-t pt-3">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium">{courseId ? "Own slots" : "Seats"}</span>
        {courseId && (
          <Button
            variant={live ? "default" : "outline"}
            size="sm"
            disabled={setLive.isPending}
            onClick={() =>
              run(
                () => setLive.mutateAsync({ courseId, live: !live }),
                live ? "Schedule hidden." : "Schedule is live.",
              )
            }
          >
            {live ? "Live: On" : "Live: Off"}
          </Button>
        )}
      </div>
      {slots.map((s) => (
        <div
          key={s.id}
          className="flex items-center justify-between gap-2 text-xs text-muted-foreground"
        >
          <span>
            {WEEKDAYS[s.weekday]} {s.startTime}–{s.endTime}
          </span>
          <Select
            value={String(s.capacity)}
            disabled={setSeats.isPending}
            onValueChange={(v) =>
              run(
                () =>
                  setSeats.mutateAsync({ slotId: s.id, capacity: Number(v) }),
                "Seats updated.",
              )
            }
          >
            <SelectTrigger className="h-7 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEATS.map((n) => (
                <SelectItem key={n} value={n}>
                  {n} seats
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}
