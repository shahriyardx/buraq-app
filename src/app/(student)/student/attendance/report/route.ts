import { TRPCError } from "@trpc/server";
import { NextResponse } from "next/server";
import { renderAttendanceReportPdf } from "@/lib/pdf/attendance-report";
import { api } from "@/trpc/server";

export async function GET() {
  let data: Awaited<ReturnType<typeof api.attendance.myReportData>>;
  try {
    data = await api.attendance.myReportData();
  } catch (err) {
    if (err instanceof TRPCError) {
      if (err.code === "NOT_FOUND") {
        return new NextResponse("Not found", { status: 404 });
      }
      if (err.code === "FORBIDDEN" || err.code === "UNAUTHORIZED") {
        return new NextResponse("Forbidden", { status: 403 });
      }
    }
    throw err;
  }

  const pdf = await renderAttendanceReportPdf(data);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="my-attendance-${data.studentId ?? "report"}.pdf"`,
    },
  });
}
