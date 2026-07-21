import { TRPCError } from "@trpc/server";
import { Mail, Pencil, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/dal";
import { formatDate, initials, toDateInput } from "@/lib/format";
import { api } from "@/trpc/server";
import { InstructorFormDialog } from "../instructor-form-dialog";

export const metadata: Metadata = { title: "Instructor detail" };

export default async function InstructorDetailPage({
  params,
}: PageProps<"/admin/instructors/[id]">) {
  await requireAdmin();
  const { id } = await params;

  const instructor = await api.instructors.get({ id }).catch((err) => {
    if (err instanceof TRPCError && err.code === "NOT_FOUND") notFound();
    throw err;
  });

  return (
    <>
      <PageHeader
        title={instructor.name}
        description={instructor.instructorId ?? "Instructor profile."}
      >
        <StatusBadge status={instructor.status} />
        <InstructorFormDialog
          mode="edit"
          instructor={{
            id: instructor.id,
            name: instructor.name,
            email: instructor.email,
            phone: instructor.phone,
            gender: instructor.gender,
            address: instructor.address,
            dob: toDateInput(instructor.dob),
            bio: instructor.bio,
            specialties: instructor.specialties,
          }}
          trigger={
            <Button variant="outline" size="sm">
              <Pencil className="mr-2 size-4" /> Edit
            </Button>
          }
        />
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="h-fit p-6">
          <div className="flex flex-col items-center text-center">
            <Avatar className="size-20">
              {instructor.photoUrl && (
                <AvatarImage src={instructor.photoUrl} alt={instructor.name} />
              )}
              <AvatarFallback className="bg-primary/10 text-lg text-primary">
                {initials(instructor.name)}
              </AvatarFallback>
            </Avatar>
            <p className="mt-3 font-heading text-lg font-semibold">
              {instructor.name}
            </p>
            {instructor.specialties && (
              <p className="text-sm text-muted-foreground">
                {instructor.specialties}
              </p>
            )}
          </div>

          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="size-4" />
              <span className="break-all">{instructor.email}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="size-4" />
              <span>{instructor.phone ?? "—"}</span>
            </div>
            {instructor.bio && (
              <p className="pt-2 text-sm leading-relaxed">{instructor.bio}</p>
            )}
          </dl>
        </Card>

        <div className="space-y-6">
          <div className="space-y-3">
            <h2 className="font-heading text-lg font-semibold">
              Courses taught
            </h2>
            <Card className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead className="text-center">Enrolled</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {instructor.courses.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="h-20 text-center text-muted-foreground"
                      >
                        No courses assigned yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    instructor.courses.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/admin/courses/${c.id}`}
                            className="hover:underline"
                          >
                            {c.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-center tabular-nums">
                          {c.enrolledCount}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={c.status} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </div>

          <div className="space-y-3">
            <h2 className="font-heading text-lg font-semibold">
              Recent sessions
            </h2>
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
                  {instructor.sessions.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="h-20 text-center text-muted-foreground"
                      >
                        No sessions scheduled.
                      </TableCell>
                    </TableRow>
                  ) : (
                    instructor.sessions.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">
                          {s.courseName}
                        </TableCell>
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
        </div>
      </div>
    </>
  );
}
