"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/trpc/client";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Occurrence = {
  slotId: string;
  date: string;
  weekday: number;
  weekStart: string;
  startTime: string;
  endTime: string;
  capacity: number;
  remaining: number;
  bookingId: string | null;
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

  async function onBook(slotId: string, date: string) {
    try {
      const res = await book.mutateAsync({ slotId, date });
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
                const disabled =
                  busy || (!o.bookingId && (o.remaining <= 0 || weekFull));
                return (
                  <li
                    key={`${o.slotId}-${o.date}`}
                    className="flex items-center justify-between gap-4 py-2.5 text-sm"
                  >
                    <div>
                      <span className="font-medium">{fmt(o.date)}</span>
                      <span className="text-muted-foreground">
                        {" · "}
                        {o.startTime}–{o.endTime}
                        {" · "}
                        {o.remaining} left
                      </span>
                    </div>
                    {o.bookingId ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => onCancel(o.bookingId as string)}
                      >
                        Cancel
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={disabled}
                        onClick={() => onBook(o.slotId, o.date)}
                      >
                        {o.remaining <= 0
                          ? "Full"
                          : weekFull
                            ? "Week full"
                            : "Book"}
                      </Button>
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
