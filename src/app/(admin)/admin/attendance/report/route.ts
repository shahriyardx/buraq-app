import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dal";
import { formatDate } from "@/lib/format";
import {
  type AttendanceReportData,
  renderAttendanceReportPdf,
} from "@/lib/pdf/attendance-report";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.user.role !== "ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const studentId = request.nextUrl.searchParams.get("studentId");
  if (!studentId) {
    return new NextResponse("Missing studentId", { status: 400 });
  }

  const [student, records, settings] = await Promise.all([
    prisma.user.findFirst({
      where: { id: studentId, role: "STUDENT" },
      select: { name: true, studentId: true },
    }),
    prisma.attendance.findMany({
      where: { studentId },
      orderBy: { date: "desc" },
      select: {
        date: true,
        status: true,
        course: { select: { name: true } },
      },
    }),
    prisma.schoolSettings.findUnique({
      where: { id: "singleton" },
      select: { name: true },
    }),
  ]);

  if (!student) {
    return new NextResponse("Student not found", { status: 404 });
  }

  const counts = { present: 0, absent: 0, late: 0, excused: 0 };
  for (const r of records) {
    if (r.status === "PRESENT") counts.present++;
    else if (r.status === "ABSENT") counts.absent++;
    else if (r.status === "LATE") counts.late++;
    else if (r.status === "EXCUSED") counts.excused++;
  }
  const total = records.length;
  const rate = total ? Math.round((counts.present / total) * 100) : 0;

  const data: AttendanceReportData = {
    schoolName: settings?.name ?? "Buraq Horse Riding School",
    studentName: student.name,
    studentId: student.studentId,
    generatedDate: formatDate(new Date()),
    summary: { ...counts, total, rate },
    rows: records.map((r) => ({
      date: formatDate(r.date),
      course: r.course.name,
      status: r.status,
    })),
  };

  const pdf = await renderAttendanceReportPdf(data);
  const fileName = `attendance-${student.studentId ?? studentId}.pdf`;

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
