import { TRPCError } from "@trpc/server";
import { Pencil } from "lucide-react";
import type { Metadata } from "next";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireAdmin } from "@/lib/dal";
import { formatCurrency, formatDate, initials } from "@/lib/format";
import { getCurrency } from "@/lib/settings";
import { api } from "@/trpc/server";
import { StudentFormDialog } from "../student-form-dialog";
import { EnrollCourseDialog } from "./enroll-course-dialog";

export const metadata: Metadata = { title: "Student profile" };

export default async function StudentProfilePage({
  params,
}: PageProps<"/admin/students/[id]">) {
  await requireAdmin();
  const { id } = await params;

  const student = await api.students.get({ id }).catch((err) => {
    if (err instanceof TRPCError && err.code === "NOT_FOUND") return null;
    throw err;
  });
  if (!student) notFound();

  const [currency, allCourses] = await Promise.all([
    getCurrency(),
    api.students.courseOptions(),
  ]);
  const enrolledIds = new Set(student.enrollments.map((e) => e.courseId));
  const availableCourses = allCourses.filter((c) => !enrolledIds.has(c.id));
  const present = student.attendances.filter(
    (a) => a.status === "PRESENT",
  ).length;
  const totalAtt = student.attendances.length;
  const rate = totalAtt ? Math.round((present / totalAtt) * 100) : 0;

  const info: [string, string][] = [
    ["Student ID", student.studentId ?? "—"],
    ["Email", student.email],
    ["Phone", student.phone ?? "—"],
    ["Gender", student.gender ?? "—"],
    ["Date of birth", formatDate(student.dob)],
    ["Address", student.address ?? "—"],
    ["Joined", formatDate(student.createdAt)],
  ];

  return (
    <>
      <PageHeader title={student.name} description="Student profile & records.">
        <StudentFormDialog
          mode="edit"
          student={{
            id: student.id,
            name: student.name,
            email: student.email,
            phone: student.phone,
            gender: student.gender,
            address: student.address,
            dob: student.dob ? student.dob.toISOString() : null,
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
              {student.photoUrl && (
                <AvatarImage src={student.photoUrl} alt={student.name} />
              )}
              <AvatarFallback className="bg-primary/10 text-lg text-primary">
                {initials(student.name)}
              </AvatarFallback>
            </Avatar>
            <p className="mt-3 text-lg font-semibold">{student.name}</p>
            <div className="mt-2">
              <StatusBadge status={student.status} />
            </div>
            <p className="mt-4 text-3xl font-bold text-primary">{rate}%</p>
            <p className="text-xs text-muted-foreground">
              Attendance ({present}/{totalAtt})
            </p>
          </div>
          <dl className="mt-6 space-y-3 text-sm">
            {info.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-right font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Tabs defaultValue="courses">
          <TabsList>
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="certificates">Certificates</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
          </TabsList>

          <TabsContent value="courses">
            <div className="mb-3 flex justify-end">
              <EnrollCourseDialog
                studentId={student.id}
                courses={availableCourses}
              />
            </div>
            <Card className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {student.enrollments.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="h-20 text-center text-muted-foreground"
                      >
                        No enrollments.
                      </TableCell>
                    </TableRow>
                  ) : (
                    student.enrollments.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">
                          {e.courseName}
                        </TableCell>
                        <TableCell>{e.progress}%</TableCell>
                        <TableCell>
                          <StatusBadge status={e.status} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="attendance">
            <Card className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {student.attendances.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="h-20 text-center text-muted-foreground"
                      >
                        No attendance records.
                      </TableCell>
                    </TableRow>
                  ) : (
                    student.attendances.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>{formatDate(a.date)}</TableCell>
                        <TableCell>{a.courseName}</TableCell>
                        <TableCell>
                          <StatusBadge status={a.status} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="certificates">
            <Card className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Certificate ID</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {student.certificates.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="h-20 text-center text-muted-foreground"
                      >
                        No certificates.
                      </TableCell>
                    </TableRow>
                  ) : (
                    student.certificates.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-xs">
                          {c.certificateId}
                        </TableCell>
                        <TableCell>{c.courseName}</TableCell>
                        <TableCell>{formatDate(c.issuedDate)}</TableCell>
                        <TableCell>
                          <StatusBadge status={c.status} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="invoices">
            <Card className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {student.invoices.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-20 text-center text-muted-foreground"
                      >
                        No invoices.
                      </TableCell>
                    </TableRow>
                  ) : (
                    student.invoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono text-xs">
                          {inv.invoiceNumber}
                        </TableCell>
                        <TableCell>{inv.courseName ?? "—"}</TableCell>
                        <TableCell>
                          {formatCurrency(inv.amount, currency)}
                        </TableCell>
                        <TableCell>{formatDate(inv.dueDate)}</TableCell>
                        <TableCell>
                          <StatusBadge status={inv.status} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
