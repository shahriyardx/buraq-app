import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireInstructor } from "@/lib/dal";
import { formatDate } from "@/lib/format";
import { api } from "@/trpc/server";

export const metadata: Metadata = { title: "Schedule" };

export default async function InstructorSchedulePage() {
  await requireInstructor();
  const sessions = await api.instructor.schedule();

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = sessions.filter(
    (s) => s.date.toISOString().slice(0, 10) >= today,
  );
  const past = sessions.filter(
    (s) => s.date.toISOString().slice(0, 10) < today,
  );

  return (
    <>
      <PageHeader
        title="Schedule"
        description="Your class sessions across all courses."
      />

      <div className="space-y-6">
        <ScheduleTable
          title="Upcoming"
          rows={upcoming}
          empty="No upcoming sessions."
        />
        <ScheduleTable title="Past" rows={past} empty="No past sessions." />
      </div>
    </>
  );
}

function ScheduleTable({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: {
    id: string;
    courseName: string;
    date: Date;
    startTime: string | null;
    endTime: string | null;
  }[];
  empty: string;
}) {
  return (
    <div className="space-y-3">
      <h2 className="font-heading text-lg font-semibold">{title}</h2>
      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Course</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="h-20 text-center text-muted-foreground"
                >
                  {empty}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.courseName}</TableCell>
                  <TableCell>{formatDate(s.date)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {s.startTime
                      ? `${s.startTime}${s.endTime ? `–${s.endTime}` : ""}`
                      : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
