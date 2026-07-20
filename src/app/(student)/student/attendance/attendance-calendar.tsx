"use client";

import { cn } from "@/lib/utils";

const STATUS_DOT: Record<string, string> = {
  PRESENT: "bg-emerald-500",
  ABSENT: "bg-red-500",
  LATE: "bg-amber-500",
  EXCUSED: "bg-sky-500",
};

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/**
 * Color-coded month calendar. `year`/`month` (0-indexed) define the grid;
 * `statuses` maps day-of-month → attendance status.
 */
export function AttendanceCalendar({
  year,
  month,
  statuses,
}: {
  year: number;
  month: number;
  statuses: Record<number, string>;
}) {
  const first = new Date(Date.UTC(year, month, 1));
  const startWeekday = first.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {WEEKDAYS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          const status = d ? statuses[d] : undefined;
          return (
            <div
              key={d ?? `blank-${i}`}
              className={cn(
                "flex aspect-square flex-col items-center justify-center rounded-md border text-sm",
                d ? "bg-card" : "border-transparent",
              )}
            >
              {d && (
                <>
                  <span
                    className={status ? "font-medium" : "text-muted-foreground"}
                  >
                    {d}
                  </span>
                  {status && (
                    <span
                      className={cn(
                        "mt-0.5 size-1.5 rounded-full",
                        STATUS_DOT[status],
                      )}
                    />
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <Legend color="bg-emerald-500" label="Present" />
        <Legend color="bg-red-500" label="Absent" />
        <Legend color="bg-amber-500" label="Late" />
        <Legend color="bg-sky-500" label="Excused" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("size-2 rounded-full", color)} />
      {label}
    </span>
  );
}
