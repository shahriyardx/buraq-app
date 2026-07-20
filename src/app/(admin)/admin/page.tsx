import {
  CalendarPlus,
  ClipboardCheck,
  FilePlus2,
  UserPlus,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAdmin } from "@/lib/dal";
import { formatDate, formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { AttendanceChart, EnrollmentsChart } from "./dashboard-charts";

export const metadata: Metadata = { title: "Dashboard" };

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

export default async function AdminDashboardPage() {
  await requireAdmin();

  // Date boundaries. Attendance rows use `@db.Date` (UTC midnight), so bucket
  // them in UTC. The 6-month enrollment window is anchored to local months.
  const now = new Date();
  const monthWindowStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const todayUtc = new Date();
  todayUtc.setUTCHours(0, 0, 0, 0);
  const weekWindowStart = new Date(todayUtc);
  weekWindowStart.setUTCDate(weekWindowStart.getUTCDate() - 6);

  const todayLocal = new Date();
  todayLocal.setHours(0, 0, 0, 0);
  const weekAhead = new Date(todayLocal);
  weekAhead.setDate(weekAhead.getDate() + 7);

  const [
    totalStudents,
    activeEnrollments,
    certificatesIssued,
    unpaidInvoices,
    openTickets,
    recentEnrollments,
    recentAttendance,
    recentActivity,
    upcomingClasses,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.enrollment.count({ where: { status: "ACTIVE" } }),
    prisma.certificate.count(),
    prisma.invoice.count({ where: { status: { in: ["UNPAID", "OVERDUE"] } } }),
    prisma.supportTicket.count({ where: { status: "OPEN" } }),
    prisma.enrollment.findMany({
      where: { createdAt: { gte: monthWindowStart } },
      select: { createdAt: true },
    }),
    prisma.attendance.findMany({
      where: { date: { gte: weekWindowStart } },
      select: { date: true, status: true },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        actorName: true,
        action: true,
        entity: true,
        createdAt: true,
      },
    }),
    prisma.classSession.findMany({
      where: { date: { gte: todayLocal, lte: weekAhead } },
      orderBy: { date: "asc" },
      take: 10,
      select: {
        id: true,
        date: true,
        startTime: true,
        endTime: true,
        instructor: true,
        course: { select: { name: true } },
      },
    }),
  ]);

  // Monthly enrollment buckets (last 6 months, oldest → newest).
  const monthBuckets = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return {
      key: `${d.getFullYear()}-${d.getMonth()}`,
      month: d.toLocaleString("en-US", { month: "short" }),
      count: 0,
    };
  });
  const monthIndex = new Map(monthBuckets.map((b, i) => [b.key, i]));
  for (const { createdAt } of recentEnrollments) {
    const key = `${createdAt.getFullYear()}-${createdAt.getMonth()}`;
    const idx = monthIndex.get(key);
    if (idx !== undefined) monthBuckets[idx].count += 1;
  }
  const enrollmentData = monthBuckets.map(({ month, count }) => ({
    month,
    count,
  }));

  // Weekly attendance rate buckets (last 7 days, oldest → newest).
  const dayBuckets = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(todayUtc);
    d.setUTCDate(d.getUTCDate() - (6 - i));
    return {
      key: dayKey(d),
      day: d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
      present: 0,
      total: 0,
    };
  });
  const dayIndex = new Map(dayBuckets.map((b, i) => [b.key, i]));
  const todayKey = dayKey(todayUtc);
  let presentToday = 0;
  for (const { date, status } of recentAttendance) {
    const key = dayKey(date);
    if (key === todayKey && status === "PRESENT") presentToday += 1;
    const idx = dayIndex.get(key);
    if (idx === undefined) continue;
    dayBuckets[idx].total += 1;
    if (status === "PRESENT") dayBuckets[idx].present += 1;
  }
  const attendanceData = dayBuckets.map(({ day, present, total }) => ({
    day,
    rate: total > 0 ? Math.round((present / total) * 100) : 0,
  }));

  return (
    <>
      <PageHeader title="Dashboard" description="Overview of your school." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label="Total students"
          value={totalStudents}
          icon="users"
          href="/admin/students"
        />
        <KpiCard
          label="Active enrollments"
          value={activeEnrollments}
          icon="book-open"
          href="/admin/courses"
        />
        <KpiCard
          label="Present today"
          value={presentToday}
          icon="calendar-check"
          href="/admin/attendance"
        />
        <KpiCard
          label="Certificates issued"
          value={certificatesIssued}
          icon="award"
          href="/admin/certificates"
        />
        <KpiCard
          label="Unpaid invoices"
          value={unpaidInvoices}
          icon="receipt"
          href="/admin/invoices"
          accent
        />
        <KpiCard
          label="Open tickets"
          value={openTickets}
          icon="life-buoy"
          href="/admin/support"
          accent
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <EnrollmentsChart data={enrollmentData} />
        <AttendanceChart data={attendanceData} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <CardHeader className="p-0">
            <CardTitle>Upcoming classes</CardTitle>
            <CardDescription>Next 7 days</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {upcomingClasses.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No classes scheduled.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {upcomingClasses.map((session) => (
                  <li
                    key={session.id}
                    className="flex items-center justify-between gap-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {session.course.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(session.date)}
                        {session.startTime && ` · ${session.startTime}`}
                        {session.endTime && `–${session.endTime}`}
                      </p>
                    </div>
                    {session.instructor && (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {session.instructor}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="p-5">
          <CardHeader className="p-0">
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Latest actions across the school</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {recentActivity.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No activity yet.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {recentActivity.map((log) => (
                  <li
                    key={log.id}
                    className="flex items-center justify-between gap-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {log.action}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {log.actorName ?? "System"}
                        {log.entity && ` · ${log.entity}`}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDateTime(log.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card className="p-5">
          <CardHeader className="p-0">
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex flex-wrap gap-2">
              <Button render={<Link href="/admin/students" />}>
                <UserPlus /> Add student
              </Button>
              <Button
                variant="outline"
                render={<Link href="/admin/attendance" />}
              >
                <ClipboardCheck /> Mark attendance
              </Button>
              <Button
                variant="outline"
                render={<Link href="/admin/certificates" />}
              >
                <FilePlus2 /> Generate certificate
              </Button>
              <Button variant="outline" render={<Link href="/admin/courses" />}>
                <CalendarPlus /> New course
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
