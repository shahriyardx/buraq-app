import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/dal";
import { api } from "@/trpc/server";
import { SlotManager } from "../courses/[id]/slot-manager";
import { SlotCalendar } from "./slot-calendar";

export const metadata: Metadata = { title: "Calendar" };

export default async function CalendarPage() {
  await requireAdmin();
  const [courses, sharedSlots] = await Promise.all([
    api.courses.list(),
    api.courses.slots({ courseId: null }),
  ]);
  const options = courses.map((c) => ({ id: c.id, name: c.name }));

  const now = new Date();

  return (
    <>
      <PageHeader
        title="Slots Calendar"
        description="Shared slots are used by every course except private ones. Click a date to see booked and open slots, and assign students."
      />
      <div className="space-y-6">
        <SlotCalendar
          courses={options}
          initialYear={now.getUTCFullYear()}
          initialMonth={now.getUTCMonth() + 1}
        />
        <SlotManager
          courseId={null}
          slots={sharedSlots}
          title="Shared training days & slots"
        />
      </div>
    </>
  );
}
