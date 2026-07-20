import { TRPCError } from "@trpc/server";
import { type NextRequest, NextResponse } from "next/server";
import { renderAttendanceReportPdf } from "@/lib/pdf/attendance-report";
import { api } from "@/trpc/server";

export async function GET(request: NextRequest) {
  const studentId = request.nextUrl.searchParams.get("studentId");
  if (!studentId) {
    return new NextResponse("Missing studentId", { status: 400 });
  }

  let data: Awaited<ReturnType<typeof api.attendance.reportData>>;
  try {
    data = await api.attendance.reportData({ studentId });
  } catch (err) {
    if (err instanceof TRPCError) {
      if (err.code === "NOT_FOUND") {
        return new NextResponse("Student not found", { status: 404 });
      }
      if (err.code === "FORBIDDEN" || err.code === "UNAUTHORIZED") {
        return new NextResponse("Forbidden", { status: 403 });
      }
    }
    throw err;
  }

  const pdf = await renderAttendanceReportPdf(data);
  const fileName = `attendance-${data.studentId ?? studentId}.pdf`;

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
