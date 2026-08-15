"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/trpc/client";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Session = {
  start: string;
  end: string;
  remaining: number;
  mine: boolean;
};

type Occurrence = {
  slotId: string;
  date: string;
  weekday: number;
  weekStart: string;
  windowStart: string;
  windowEnd: string;
  sessionMinutes: number;
  capacity: number;
  bookingId: string | null;
  bookedStart: string | null;
  sessions: Session[];
};

type CourseBlock = {
  courseId: string;
  courseName: string;
  status: string;
  requiredWeeks: number;
  completedWeeks: number;
  bonusWeeks: number;
  maxBookingsPerWeek: number;
  bookingOpen: boolean;
  occurrences: Occurrence[];
  weekUsage: Record<string, number>;
};

function fmt(dateISO: string) {
  const d = new Date(`${dateISO}T00:00:00.000Z`);
  const day = WEEKDAYS[d.getUTCDay()];
  return `${day} ${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
}

export function BookingBoard({ courses }: { courses: CourseBlock[] }) {
  const router = useRouter();
  const book = trpc.bookings.book.useMutation();
  const cancel = trpc.bookings.cancel.useMutation();
  const busy = book.isPending || cancel.isPending;

  async function onBook(slotId: string, date: string, startTime: string) {
    try {
      const res = await book.mutateAsync({ slotId, date, startTime });
      toast.success(
        res.status === "COMPLETED"
          ? "Booked — course completed! 🎉"
          : "Slot booked.",
      );
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function onCancel(id: string) {
    try {
      await cancel.mutateAsync({ id });
      toast.success("Booking cancelled.");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  if (courses.length === 0) {
    return (
      <Card className="p-10 text-center text-sm text-muted-foreground">
        No active courses with training slots yet. Enrol and get approved to
        start booking.
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {courses.map((c) => (
        <Card key={c.courseId} className="p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading text-lg font-semibold">
                  {c.courseName}
                </h2>
                <StatusBadge status={c.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                {c.requiredWeeks > 0
                  ? `Weeks completed: ${c.completedWeeks}/${c.requiredWeeks}${c.bonusWeeks ? ` (+${c.bonusWeeks} granted)` : ""}`
                  : "No fixed duration"}
                {" · "}
                {c.maxBookingsPerWeek}/week limit
              </p>
            </div>
          </div>

          {!c.bookingOpen ? (
            <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              {c.status === "COMPLETED"
                ? "Course completed — no more bookings needed."
                : c.status === "INCOMPLETE"
                  ? "Your booking window has closed. Ask the office for an extra week."
                  : "Booking is not open."}
            </p>
          ) : c.occurrences.length === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              No upcoming slots in your booking window.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {c.occurrences.map((o) => {
                const weekFull =
                  (c.weekUsage[o.weekStart] ?? 0) >= c.maxBookingsPerWeek;
                return (
                  <li key={`${o.slotId}-${o.date}`} className="py-3">
                    <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                      <span>
                        <span className="font-medium">{fmt(o.date)}</span>
                        <span className="text-muted-foreground">
                          {" · "}
                          {o.windowStart}–{o.windowEnd} · {o.sessions.length}{" "}
                          sessions × {o.sessionMinutes}min · {o.capacity} seats
                          each
                        </span>
                      </span>
                      {o.bookingId && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => onCancel(o.bookingId as string)}
                        >
                          Cancel {o.bookedStart}
                        </Button>
                      )}
                    </div>

                    {!o.bookingId && (
                      <div className="flex flex-wrap gap-1.5">
                        {o.sessions.map((s) => {
                          const full = s.remaining <= 0;
                          return (
                            <Button
                              key={s.start}
                              variant="outline"
                              size="sm"
                              className="h-8 px-2 text-xs"
                              disabled={busy || full || weekFull}
                              onClick={() => onBook(o.slotId, o.date, s.start)}
                              title={`${s.remaining} left`}
                            >
                              {s.start}–{s.end}
                              {full ? " · full" : ` · ${s.remaining} left`}
                            </Button>
                          );
                        })}
                        {weekFull && (
                          <span className="self-center text-xs text-muted-foreground">
                            Weekly limit reached
                          </span>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      ))}
    </div>
  );
}
