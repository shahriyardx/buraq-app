import {
  Award,
  BookOpen,
  CalendarDays,
  FileText,
  LifeBuoy,
  Receipt,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireStudent } from "@/lib/dal";
import { formatDate, formatDateTime, initials } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { AttendanceDonut } from "./student-charts";

export const metadata: Metadata = { title: "Dashboard" };

export default async function StudentDashboardPage() {
  const session = await requireStudent();
  const studentId = session.user.id;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAhead = new Date(today);
  weekAhead.setDate(weekAhead.getDate() + 30);

  const [student, monthAttendance, activeEnrollment, certCount, announcements] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: studentId },
        select: { name: true, photoUrl: true, studentId: true, status: true },
      }),
      prisma.attendance.findMany({
        where: { studentId, date: { gte: monthStart } },
        select: { status: true },
      }),
      prisma.enrollment.findFirst({
        where: { studentId, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        include: { course: true },
      }),
      prisma.certificate.count({ where: { studentId, status: "VALID" } }),
      prisma.announcement.findMany({
        orderBy: { publishedAt: "desc" },
        take: 3,
      }),
    ]);

  const counts = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 };
  for (const a of monthAttendance) counts[a.status] += 1;
  const total = monthAttendance.length;
  const rate = total ? Math.round((counts.PRESENT / total) * 100) : 0;
  const donutData = [
    { name: "Present", value: counts.PRESENT },
    { name: "Late", value: counts.LATE },
    { name: "Absent", value: counts.ABSENT },
    { name: "Excused", value: counts.EXCUSED },
  ];

  // Upcoming classes for the student's enrolled courses.
  const enrolledCourseIds = (
    await prisma.enrollment.findMany({
      where: { studentId, status: { in: ["ACTIVE", "COMPLETED"] } },
      select: { courseId: true },
    })
  ).map((e) => e.courseId);
  const upcoming = enrolledCourseIds.length
    ? await prisma.classSession.findMany({
        where: {
          courseId: { in: enrolledCourseIds },
          date: { gte: today, lte: weekAhead },
        },
        orderBy: { date: "asc" },
        take: 3,
        include: { course: { select: { name: true } } },
      })
    : [];

  const quickLinks = [
    { label: "Certificates", href: "/student/certificates", icon: Award },
    { label: "View invoices", href: "/student/invoices", icon: Receipt },
    { label: "Contact support", href: "/student/support", icon: LifeBuoy },
    { label: "Browse courses", href: "/student/courses", icon: BookOpen },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <Card className="flex flex-row items-center gap-4 p-5">
        <Avatar className="size-14">
          {student?.photoUrl && (
            <AvatarImage src={student.photoUrl} alt={student.name} />
          )}
          <AvatarFallback className="bg-primary/10 text-primary">
            {initials(student?.name ?? "S")}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-lg font-semibold">Welcome back, {student?.name}</p>
          <p className="text-sm text-muted-foreground">
            {student?.studentId ?? "—"}
            {student?.status && (
              <span className="ml-2 align-middle">
                <StatusBadge status={student.status} />
              </span>
            )}
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Attendance */}
        <Card className="p-5">
          <CardHeader className="p-0">
            <CardTitle>Attendance</CardTitle>
            <CardDescription>This month ({total} sessions)</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <AttendanceDonut data={donutData} rate={rate} />
            <div className="mt-2 flex justify-center gap-4 text-xs text-muted-foreground">
              <span>Present {counts.PRESENT}</span>
              <span>Late {counts.LATE}</span>
              <span>Absent {counts.ABSENT}</span>
            </div>
          </CardContent>
        </Card>

        {/* Active course */}
        <Card className="p-5">
          <CardHeader className="p-0">
            <CardTitle>Active course</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-0 pt-2">
            {activeEnrollment ? (
              <>
                <p className="font-semibold">{activeEnrollment.course.name}</p>
                <p className="text-sm text-muted-foreground">
                  {activeEnrollment.course.level ?? ""} ·{" "}
                  {activeEnrollment.course.instructor ?? "—"}
                </p>
                <div>
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>Progress</span>
                    <span>{activeEnrollment.progress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${activeEnrollment.progress}%` }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No active course.</p>
            )}
          </CardContent>
        </Card>

        {/* Certificates + quick links */}
        <Card className="p-5">
          <CardHeader className="p-0">
            <CardTitle>Certificates</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-2">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-lg bg-accent/20 text-accent-foreground">
                <Award className="size-6" />
              </div>
              <div>
                <p className="text-2xl font-bold">{certCount}</p>
                <p className="text-xs text-muted-foreground">earned</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 w-full"
              render={<Link href="/student/certificates" />}
            >
              <FileText className="mr-2 size-4" /> View certificates
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Upcoming classes */}
        <Card className="p-5">
          <CardHeader className="p-0">
            <CardTitle>Upcoming classes</CardTitle>
            <CardDescription>Your next sessions</CardDescription>
          </CardHeader>
          <CardContent className="p-0 pt-2">
            {upcoming.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No upcoming classes.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {upcoming.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 py-3">
                    <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <CalendarDays className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{s.course.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(s.date)}
                        {s.startTime && ` · ${s.startTime}`}
                        {s.endTime && `–${s.endTime}`}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Announcements */}
        <Card className="p-5">
          <CardHeader className="p-0">
            <CardTitle>Announcements</CardTitle>
            <CardDescription>Latest from the school</CardDescription>
          </CardHeader>
          <CardContent className="p-0 pt-2">
            {announcements.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No announcements.
              </p>
            ) : (
              <ul className="space-y-3">
                {announcements.map((a) => (
                  <li key={a.id} className="border-l-2 border-accent pl-3">
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {a.body}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(a.publishedAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {quickLinks.map((l) => (
          <Button
            key={l.href}
            variant="outline"
            className="h-auto flex-col gap-2 py-4"
            render={<Link href={l.href} />}
          >
            <l.icon className="size-5" />
            <span className="text-xs">{l.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
