import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/dal";
import { api } from "@/trpc/server";
import { SlotCalendar } from "./slot-calendar";

export const metadata: Metadata = { title: "Calendar" };

export default async function CalendarPage() {
  await requireAdmin();
  const courses = await api.courses.list();
  const options = courses.map((c) => ({ id: c.id, name: c.name }));

  const now = new Date();

  return (
    <>
      <PageHeader
        title="Slots Calendar"
        description="Per-course month view. Click a date to see booked and open slots, and assign students."
      />
      {options.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No courses yet. Create a course with training slots first.
        </Card>
      ) : (
        <SlotCalendar
          courses={options}
          initialCourseId={options[0].id}
          initialYear={now.getUTCFullYear()}
          initialMonth={now.getUTCMonth() + 1}
        />
      )}
    </>
  );
}
