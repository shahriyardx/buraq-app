import type { Prisma } from "@prisma/client";
import { AlertTriangle, Download } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { toAttendanceDate } from "../date";
import { HistoryFilters } from "../history-filters";
import { type HistoryRow, HistoryTable } from "../history-table";

export const metadata: Metadata = { title: "Attendance History" };

type Summary = {
  studentId: string;
  name: string;
  studentCode: string | null;
  present: number;
  total: number;
  rate: number;
  belowThreshold: boolean;
};

export default async function AttendanceHistoryPage({
  searchParams,
}: PageProps<"/admin/attendance/history">) {
  await requireAdmin();

  const sp = await searchParams;
  const studentId = typeof sp.studentId === "string" ? sp.studentId : "";
  const courseId = typeof sp.courseId === "string" ? sp.courseId : "";
  const from = typeof sp.from === "string" ? sp.from : "";
  const to = typeof sp.to === "string" ? sp.to : "";

  const fromDate = toAttendanceDate(from);
  const toDate = toAttendanceDate(to);

  const where: Prisma.AttendanceWhereInput = {};
  if (studentId) where.studentId = studentId;
  if (courseId) where.courseId = courseId;
  if (fromDate || toDate) {
    where.date = {
      ...(fromDate ? { gte: fromDate } : {}),
      ...(toDate ? { lte: toDate } : {}),
    };
  }

  const [records, students, courses, settings] = await Promise.all([
    prisma.attendance.findMany({
      where,
      orderBy: { date: "desc" },
      select: {
        id: true,
        date: true,
        status: true,
        student: { select: { id: true, name: true, studentId: true } },
        course: { select: { name: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: "STUDENT" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.course.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.schoolSettings.findUnique({
      where: { id: "singleton" },
      select: { attendanceThreshold: true },
    }),
  ]);

  const threshold = settings?.attendanceThreshold ?? 75;

  const rows: HistoryRow[] = records.map((r) => ({
    id: r.id,
    date: r.date.toISOString(),
    studentName: r.student.name,
    studentCode: r.student.studentId,
    courseName: r.course.name,
    status: r.status,
  }));

  // Per-student attendance rate across the filtered set.
  const map = new Map<string, Summary>();
  for (const r of records) {
    let entry = map.get(r.student.id);
    if (!entry) {
      entry = {
        studentId: r.student.id,
        name: r.student.name,
        studentCode: r.student.studentId,
        present: 0,
        total: 0,
        rate: 0,
        belowThreshold: false,
      };
      map.set(r.student.id, entry);
    }
    entry.total++;
    if (r.status === "PRESENT") entry.present++;
  }
  const summaries = [...map.values()]
    .map((s) => {
      const rate = s.total ? Math.round((s.present / s.total) * 100) : 0;
      return { ...s, rate, belowThreshold: rate < threshold };
    })
    .sort((a, b) => a.rate - b.rate);

  const flagged = summaries.filter((s) => s.belowThreshold);

  return (
    <>
      <PageHeader
        title="Attendance History"
        description="Review, correct, and export attendance records."
      />

      <Card className="mb-6 p-4">
        <HistoryFilters
          students={students}
          courses={courses}
          values={{ studentId, courseId, from, to }}
        />
      </Card>

      {summaries.length > 0 && (
        <Card className="mb-6 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-sm font-semibold">
              Attendance summary
            </h2>
            <span className="text-xs text-muted-foreground">
              Threshold {threshold}%
              {flagged.length > 0
                ? ` · ${flagged.length} below`
                : " · all above"}
            </span>
          </div>
          <div className="space-y-2">
            {summaries.map((s) => (
              <div
                key={s.studentId}
                className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
              >
                <div className="min-w-0 leading-tight">
                  <p className="truncate font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.present}/{s.total} present
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {s.belowThreshold ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-500/15 dark:text-red-300">
                      <AlertTriangle className="size-3" />
                      {s.rate}%
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
                      {s.rate}%
                    </span>
                  )}
                  <a
                    href={`/admin/attendance/report?studentId=${s.studentId}`}
                    className={buttonVariants({
                      variant: "outline",
                      size: "xs",
                    })}
                  >
                    <Download className="mr-1 size-3" />
                    PDF
                  </a>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <HistoryTable rows={rows} />
    </>
  );
}
