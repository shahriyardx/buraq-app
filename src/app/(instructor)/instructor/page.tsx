import { BookOpen, CalendarClock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import { requireInstructor } from "@/lib/dal";
import { formatDate } from "@/lib/format";
import { api } from "@/trpc/server";

export const metadata: Metadata = { title: "Instructor Dashboard" };

export default async function InstructorDashboardPage() {
  const session = await requireInstructor();
  const data = await api.instructor.dashboard();

  return (
    <>
      <PageHeader
        title={`Welcome, ${session.user.name.split(" ")[0]}`}
        description="Your courses, schedule, and riders at a glance."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Courses"
          value={data.courseCount}
          icon="book-open"
          href="/instructor/courses"
        />
        <KpiCard
          label="Active courses"
          value={data.activeCourseCount}
          icon="book-open"
          accent
        />
        <KpiCard
          label="Riders"
          value={data.studentCount}
          icon="users"
          href="/instructor/students"
        />
        <KpiCard
          label="Upcoming classes"
          value={data.upcomingCount}
          icon="calendar-check"
          href="/instructor/schedule"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className="font-heading text-lg font-semibold">Your courses</h2>
          <Card className="divide-y divide-border p-0">
            {data.courses.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                No courses assigned yet.
              </p>
            ) : (
              data.courses.map((c) => (
                <Link
                  key={c.id}
                  href="/instructor/courses"
                  className="flex items-center justify-between gap-4 p-4 hover:bg-muted/40"
                >
                  <div className="flex items-center gap-3">
                    <BookOpen className="size-4 text-primary" />
                    <span className="font-medium">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {c.enrolledCount} riders
                    </span>
                    <StatusBadge status={c.status} />
                  </div>
                </Link>
              ))
            )}
          </Card>
        </div>

        <div className="space-y-3">
          <h2 className="font-heading text-lg font-semibold">
            Upcoming classes
          </h2>
          <Card className="divide-y divide-border p-0">
            {data.upcoming.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                No upcoming classes scheduled.
              </p>
            ) : (
              data.upcoming.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-4 p-4"
                >
                  <div className="flex items-center gap-3">
                    <CalendarClock className="size-4 text-primary" />
                    <span className="font-medium">{s.courseName}</span>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>{formatDate(s.date)}</p>
                    {s.startTime && (
                      <p className="text-xs">
                        {s.startTime}
                        {s.endTime && `–${s.endTime}`}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
