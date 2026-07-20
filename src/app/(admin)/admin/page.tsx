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
import { api } from "@/trpc/server";
import { AttendanceChart, EnrollmentsChart } from "./dashboard-charts";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
  await requireAdmin();
  const stats = await api.dashboard.stats();

  return (
    <>
      <PageHeader title="Dashboard" description="Overview of your school." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label="Total students"
          value={stats.totalStudents}
          icon="users"
          href="/admin/students"
        />
        <KpiCard
          label="Active enrollments"
          value={stats.activeEnrollments}
          icon="book-open"
          href="/admin/courses"
        />
        <KpiCard
          label="Present today"
          value={stats.presentToday}
          icon="calendar-check"
          href="/admin/attendance"
        />
        <KpiCard
          label="Certificates issued"
          value={stats.certificatesIssued}
          icon="award"
          href="/admin/certificates"
        />
        <KpiCard
          label="Unpaid invoices"
          value={stats.unpaidInvoices}
          icon="receipt"
          href="/admin/invoices"
          accent
        />
        <KpiCard
          label="Open tickets"
          value={stats.openTickets}
          icon="life-buoy"
          href="/admin/support"
          accent
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <EnrollmentsChart data={stats.enrollmentData} />
        <AttendanceChart data={stats.attendanceData} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <CardHeader className="p-0">
            <CardTitle>Upcoming classes</CardTitle>
            <CardDescription>Next 7 days</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {stats.upcomingClasses.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No classes scheduled.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {stats.upcomingClasses.map((session) => (
                  <li
                    key={session.id}
                    className="flex items-center justify-between gap-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {session.courseName}
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
            {stats.recentActivity.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No activity yet.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {stats.recentActivity.map((log) => (
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
