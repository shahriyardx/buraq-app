import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  // generic
  ACTIVE:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  INACTIVE: "bg-zinc-200 text-zinc-700 dark:bg-zinc-500/20 dark:text-zinc-300",
  ARCHIVED: "bg-zinc-200 text-zinc-700 dark:bg-zinc-500/20 dark:text-zinc-300",
  PENDING:
    "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  COMPLETED: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
  CANCELLED: "bg-zinc-200 text-zinc-700 dark:bg-zinc-500/20 dark:text-zinc-300",
  // attendance
  PRESENT:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  ABSENT: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
  LATE: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  EXCUSED: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  // certificate / invoice
  VALID:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  REVOKED: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
  PAID: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  UNPAID:
    "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  OVERDUE: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
  // tickets
  OPEN: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  IN_PROGRESS:
    "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
  RESOLVED:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        STYLES[status] ?? "bg-muted text-muted-foreground",
      )}
    >
      {status.replace(/_/g, " ").toLowerCase()}
    </span>
  );
}
