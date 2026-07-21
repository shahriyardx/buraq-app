import {
  Award,
  BookOpen,
  CalendarDays,
  GraduationCap,
  User,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireStudent } from "@/lib/dal";
import { formatCurrency, formatDate } from "@/lib/format";
import { getCurrency } from "@/lib/settings";
import { api } from "@/trpc/server";
import { EnrollButton } from "./enroll-button";

export const metadata: Metadata = { title: "My Courses" };

export default async function StudentCoursesPage() {
  await requireStudent();
  const [{ current, history, browse }, currency] = await Promise.all([
    api.courses.myCourses(),
    getCurrency(),
  ]);

  return (
    <>
      <PageHeader
        title="My Courses"
        description="Your current studies, past courses, and what's on offer."
      />

      <div className="space-y-8">
        {/* Current course(s) */}
        <section className="space-y-3">
          <h2 className="font-heading text-lg font-semibold">Current course</h2>
          {current.length === 0 ? (
            <Card className="p-5">
              <p className="text-sm text-muted-foreground">
                You aren't enrolled in any active course right now. Browse the
                catalog below to request enrollment.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {current.map((e) => (
                <Card key={e.id} className="p-5">
                  <CardHeader className="p-0">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">
                        {e.course.name}
                      </CardTitle>
                      <StatusBadge status={e.status} />
                    </div>
                    {e.course.description && (
                      <CardDescription className="line-clamp-2">
                        {e.course.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4 p-0 pt-3">
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <Meta icon={User} label="Instructor">
                        {e.course.instructor ?? "—"}
                      </Meta>
                      <Meta icon={CalendarDays} label="Schedule">
                        {e.course.schedule ?? "—"}
                      </Meta>
                      <Meta icon={CalendarDays} label="Start">
                        {formatDate(e.startDate)}
                      </Meta>
                      <Meta icon={CalendarDays} label="Ends">
                        {formatDate(e.endDate)}
                      </Meta>
                    </dl>
                    <div>
                      <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                        <span>Progress</span>
                        <span>{e.progress}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${e.progress}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Course history */}
        <section className="space-y-3">
          <h2 className="font-heading text-lg font-semibold">Course history</h2>
          {history.length === 0 ? (
            <Card className="p-5">
              <p className="text-sm text-muted-foreground">
                No completed courses yet.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {history.map((e) => (
                <Card key={e.id} className="p-5">
                  <CardHeader className="p-0">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">
                        {e.courseName}
                      </CardTitle>
                      <StatusBadge status={e.status} />
                    </div>
                    <CardDescription>
                      Completed {formatDate(e.endDate)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 pt-3">
                    {e.certified ? (
                      <Link
                        href="/student/certificates"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                      >
                        <Award className="size-4" /> Certificate issued
                      </Link>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Browse & enroll */}
        <section className="space-y-3">
          <div className="space-y-1">
            <h2 className="font-heading text-lg font-semibold">
              Browse &amp; enroll
            </h2>
            <p className="text-sm text-muted-foreground">
              Requesting a course sends it to an administrator for approval.
            </p>
          </div>
          {browse.length === 0 ? (
            <Card className="p-5">
              <p className="text-sm text-muted-foreground">
                No other courses are available to enroll in right now.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {browse.map((c) => (
                <Card key={c.id} className="flex flex-col p-5">
                  <CardHeader className="p-0">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{c.name}</CardTitle>
                      {c.level && (
                        <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                          {c.level}
                        </span>
                      )}
                    </div>
                    {c.description && (
                      <CardDescription className="line-clamp-2">
                        {c.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col justify-between gap-4 p-0 pt-3">
                    <dl className="space-y-2 text-sm">
                      <Meta icon={User} label="Instructor">
                        {c.instructor ?? "—"}
                      </Meta>
                      <Meta icon={GraduationCap} label="Price">
                        {formatCurrency(c.price, currency)}
                      </Meta>
                    </dl>
                    {c.requested ? (
                      <Button size="sm" className="w-full" disabled>
                        Requested
                      </Button>
                    ) : (
                      <EnrollButton courseId={c.id} courseName={c.name} />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {browse.length === 0 &&
          current.length === 0 &&
          history.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
              <BookOpen className="size-8" />
              <p className="text-sm">Nothing here yet.</p>
            </div>
          )}
      </div>
    </>
  );
}

function Meta({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium text-foreground">{children}</span>
    </div>
  );
}
