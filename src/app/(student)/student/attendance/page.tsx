import { AlertTriangle, Download } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireStudent } from "@/lib/dal";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { AttendanceCalendar } from "./attendance-calendar";

export const metadata: Metadata = { title: "My Attendance" };

export default async function StudentAttendancePage({
  searchParams,
}: PageProps<"/student/attendance">) {
  const session = await requireStudent();
  const studentId = session.user.id;
  const params = await searchParams;

  // Month window (default current month), month param = YYYY-MM.
  const now = new Date();
  let year = now.getUTCFullYear();
  let month = now.getUTCMonth();
  if (typeof params.month === "string" && /^\d{4}-\d{2}$/.test(params.month)) {
    const [y, m] = params.month.split("-").map(Number);
    year = y;
    month = m - 1;
  }
  const monthStart = new Date(Date.UTC(year, month, 1));
  const monthEnd = new Date(Date.UTC(year, month + 1, 1));

  const [rows, settings] = await Promise.all([
    prisma.attendance.findMany({
      where: { studentId, date: { gte: monthStart, lt: monthEnd } },
      orderBy: { date: "desc" },
      include: { course: { select: { name: true } } },
    }),
    prisma.schoolSettings.findUnique({ where: { id: "singleton" } }),
  ]);

  const counts = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 };
  const dayStatuses: Record<number, string> = {};
  for (const r of rows) {
    counts[r.status] += 1;
    dayStatuses[new Date(r.date).getUTCDate()] = r.status;
  }
  const total = rows.length;
  const rate = total ? Math.round((counts.PRESENT / total) * 100) : 0;
  const threshold = settings?.attendanceThreshold ?? 75;
  const belowThreshold = total > 0 && rate < threshold;

  const monthLabel = monthStart.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const prevMonth = new Date(Date.UTC(year, month - 1, 1));
  const nextMonth = new Date(Date.UTC(year, month + 1, 1));
  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

  return (
    <>
      <PageHeader title="My Attendance" description={monthLabel}>
        <Link
          href={`/student/attendance?month=${fmt(prevMonth)}`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          ← Prev
        </Link>
        <Link
          href={`/student/attendance?month=${fmt(nextMonth)}`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Next →
        </Link>
        <a
          href="/student/attendance/report"
          className={buttonVariants({ variant: "default", size: "sm" })}
        >
          <Download className="mr-2 size-4" /> PDF
        </a>
      </PageHeader>

      {belowThreshold && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="size-4 shrink-0" />
          Your attendance ({rate}%) is below the school minimum of {threshold}%.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="p-5">
          <CardHeader className="p-0">
            <CardTitle>Day-by-day log</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-3">
            <div className="mb-4 grid grid-cols-4 gap-2 text-center">
              <Stat label="Present" value={counts.PRESENT} />
              <Stat label="Late" value={counts.LATE} />
              <Stat label="Absent" value={counts.ABSENT} />
              <Stat label="Rate" value={`${rate}%`} />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="h-20 text-center text-muted-foreground"
                    >
                      No attendance records this month.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{formatDate(r.date)}</TableCell>
                      <TableCell>{r.course.name}</TableCell>
                      <TableCell>
                        <StatusBadge status={r.status} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="h-fit p-5">
          <CardHeader className="p-0">
            <CardTitle>{monthLabel}</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-3">
            <AttendanceCalendar
              year={year}
              month={month}
              statuses={dayStatuses}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border p-2">
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
