import { Users } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import { requireInstructor } from "@/lib/dal";
import { api } from "@/trpc/server";
import { ScheduleControls } from "./schedule-controls";

export const metadata: Metadata = { title: "My Courses" };

export default async function InstructorCoursesPage() {
  await requireInstructor();
  const [courses, sharedSlots] = await Promise.all([
    api.instructor.courses(),
    api.instructor.sharedSlots(),
  ]);

  return (
    <>
      <PageHeader
        title="My Courses"
        description="Courses you are assigned to teach."
      />

      {sharedSlots.length > 0 && (
        <Card className="mb-6 p-5">
          <h3 className="font-heading font-semibold">Shared slots</h3>
          <p className="mb-2 text-xs text-muted-foreground">
            Used by every course except private ones. Set seats to the number of
            horses.
          </p>
          <ScheduleControls slots={sharedSlots} />
        </Card>
      )}

      {courses.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          You have no assigned courses yet.
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <Card key={c.id} className="flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-heading font-semibold">{c.name}</h3>
                <StatusBadge status={c.status} />
              </div>
              {c.level && (
                <p className="text-xs text-muted-foreground">{c.level}</p>
              )}
              {c.description && (
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {c.description}
                </p>
              )}
              <div className="mt-auto flex items-center gap-4 pt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Users className="size-4" />
                  {c.enrolledCount} riders
                </span>
                {c.schedule && <span>{c.schedule}</span>}
              </div>
              <ScheduleControls
                courseId={c.id}
                live={c.scheduleLive}
                slots={c.slots}
              />
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
