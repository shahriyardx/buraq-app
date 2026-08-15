import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { requireStudent } from "@/lib/dal";
import { formatDate } from "@/lib/format";
import { api } from "@/trpc/server";
import { BookingBoard } from "./booking-board";

export const metadata: Metadata = { title: "Book Training" };

export default async function StudentBookingsPage() {
  await requireStudent();
  const [courses, mine] = await Promise.all([
    api.bookings.available(),
    api.bookings.mine(),
  ]);

  return (
    <>
      <PageHeader
        title="Book Training"
        description="Reserve your weekly training slots. Book at least once a week to complete your course."
      />

      {mine.length > 0 && (
        <Card className="mb-6 p-5">
          <p className="mb-3 font-semibold">Your upcoming bookings</p>
          <ul className="divide-y divide-border">
            {mine.map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between gap-4 py-2 text-sm"
              >
                <span className="font-medium">{b.courseName}</span>
                <span className="text-muted-foreground">
                  {formatDate(b.date)}
                  {b.startTime ? ` · ${b.startTime}–${b.endTime}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <BookingBoard courses={courses} />
    </>
  );
}
