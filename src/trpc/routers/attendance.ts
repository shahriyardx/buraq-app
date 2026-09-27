import type { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { toAttendanceDate } from "@/app/(admin)/admin/attendance/date";
import { logAction } from "@/lib/audit";
import { formatDate } from "@/lib/format";
import { schoolLogoDataUrl } from "@/lib/pdf/assets";
import type { AttendanceReportData } from "@/lib/pdf/attendance-report";
import { prisma } from "@/lib/prisma";
import { adminProcedure, createTRPCRouter, studentProcedure } from "../init";

const statusEnum = z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]);

const DEFAULT_THRESHOLD = 75;

async function buildReportData(
  studentId: string,
): Promise<AttendanceReportData> {
  const [student, records, settings] = await Promise.all([
    prisma.user.findFirst({
      where: { id: studentId, role: "STUDENT" },
      select: { name: true, studentId: true },
    }),
    prisma.attendance.findMany({
      where: { studentId },
      orderBy: { date: "desc" },
      select: { date: true, status: true, course: { select: { name: true } } },
    }),
    prisma.schoolSettings.findUnique({
      where: { id: "singleton" },
      select: { name: true, logoUrl: true },
    }),
  ]);

  if (!student) throw new TRPCError({ code: "NOT_FOUND" });

  const counts = { present: 0, absent: 0, late: 0, excused: 0 };
  for (const r of records) {
    if (r.status === "PRESENT") counts.present++;
    else if (r.status === "ABSENT") counts.absent++;
    else if (r.status === "LATE") counts.late++;
    else if (r.status === "EXCUSED") counts.excused++;
  }
  const total = records.length;
  const rate = total ? Math.round((counts.present / total) * 100) : 0;

  return {
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
    logoSrc: await schoolLogoDataUrl(settings?.logoUrl),
  };
}

export const attendanceRouter = createTRPCRouter({
  courseOptions: adminProcedure.query(async () => {
    return prisma.course.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
  }),

  studentOptions: adminProcedure.query(async () => {
    return prisma.user.findMany({
      where: { role: "STUDENT" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
  }),

  roster: adminProcedure
    .input(z.object({ courseId: z.string(), date: z.string() }))
    .query(async ({ input }) => {
      const date = toAttendanceDate(input.date);
      if (!input.courseId || !date) return [];

      const [enrollments, existing] = await Promise.all([
        prisma.enrollment.findMany({
          where: { courseId: input.courseId, status: "ACTIVE" },
          select: {
            student: { select: { id: true, name: true, studentId: true } },
          },
          orderBy: { student: { name: "asc" } },
        }),
        prisma.attendance.findMany({
          where: { courseId: input.courseId, date },
          select: { studentId: true, status: true },
        }),
      ]);
      const byStudent = new Map(existing.map((a) => [a.studentId, a.status]));
      return enrollments.map((e) => ({
        studentId: e.student.id,
        name: e.student.name,
        studentCode: e.student.studentId,
        status: byStudent.get(e.student.id) ?? null,
      }));
    }),

  save: adminProcedure
    .input(
      z.object({
        courseId: z.string(),
        date: z.string(),
        entries: z.array(
          z.object({ studentId: z.string(), status: statusEnum }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const date = toAttendanceDate(input.date);
      if (!input.courseId || !date) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Course and date are required.",
        });
      }

      // The roster is the set of active enrollments — never trust arbitrary
      // student ids from the client.
      const enrollments = await prisma.enrollment.findMany({
        where: { courseId: input.courseId, status: "ACTIVE" },
        select: { studentId: true },
      });
      const rosterIds = new Set(enrollments.map((e) => e.studentId));

      const existing = await prisma.attendance.findMany({
        where: { courseId: input.courseId, date },
        select: { id: true, studentId: true, status: true },
      });
      const byStudent = new Map(existing.map((a) => [a.studentId, a]));

      const byInput = new Map(
        input.entries.map((e) => [e.studentId, e.status]),
      );

      let changed = 0;
      for (const studentId of rosterIds) {
        const status = byInput.get(studentId);
        if (!status) continue; // left unmarked

        const prevRecord = byStudent.get(studentId);
        if (prevRecord && prevRecord.status === status) continue; // no change

        const record = await prisma.attendance.upsert({
          where: {
            studentId_courseId_date: {
              studentId,
              courseId: input.courseId,
              date,
            },
          },
          create: {
            studentId,
            courseId: input.courseId,
            date,
            status,
            markedBy: ctx.session.user.id,
          },
          update: { status, markedBy: ctx.session.user.id },
        });
        await prisma.attendanceChangeLog.create({
          data: {
            attendanceId: record.id,
            fromStatus: prevRecord?.status ?? null,
            toStatus: status,
            changedBy: ctx.session.user.id,
          },
        });
        changed++;
      }

      await logAction({
        actorId: ctx.session.user.id,
        actorName: ctx.session.user.name,
        action: "attendance.save",
        entity: "Course",
        entityId: input.courseId,
        detail: `${changed} record${changed === 1 ? "" : "s"} for ${input.date}`,
      });

      return { changed };
    }),

  edit: adminProcedure
    .input(z.object({ attendanceId: z.string(), status: statusEnum }))
    .mutation(async ({ ctx, input }) => {
      const current = await prisma.attendance.findUnique({
        where: { id: input.attendanceId },
        select: { id: true, status: true },
      });
      if (!current) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Attendance record not found.",
        });
      }

      if (current.status === input.status) {
        return { changed: false };
      }

      await prisma.attendance.update({
        where: { id: input.attendanceId },
        data: { status: input.status, markedBy: ctx.session.user.id },
      });
      await prisma.attendanceChangeLog.create({
        data: {
          attendanceId: input.attendanceId,
          fromStatus: current.status,
          toStatus: input.status,
          changedBy: ctx.session.user.id,
        },
      });

      await logAction({
        actorId: ctx.session.user.id,
        actorName: ctx.session.user.name,
        action: "attendance.edit",
        entity: "Attendance",
        entityId: input.attendanceId,
        detail: `${current.status} → ${input.status}`,
      });

      return { changed: true };
    }),

  history: adminProcedure
    .input(
      z.object({
        studentId: z.string().optional(),
        courseId: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const fromDate = input.from ? toAttendanceDate(input.from) : null;
      const toDate = input.to ? toAttendanceDate(input.to) : null;

      const where: Prisma.AttendanceWhereInput = {};
      if (input.studentId) where.studentId = input.studentId;
      if (input.courseId) where.courseId = input.courseId;
      if (fromDate || toDate) {
        where.date = {
          ...(fromDate ? { gte: fromDate } : {}),
          ...(toDate ? { lte: toDate } : {}),
        };
      }

      const [records, settings] = await Promise.all([
        prisma.attendance.findMany({
          where,
          orderBy: { date: "desc" },
          select: {
            id: true,
            date: true,
            status: true,
            student: { select: { id: true, name: true, studentId: true } },
            course: { select: { name: true } },
          },
        }),
        prisma.schoolSettings.findUnique({
          where: { id: "singleton" },
          select: { attendanceThreshold: true },
        }),
      ]);

      const threshold = settings?.attendanceThreshold ?? DEFAULT_THRESHOLD;

      const rows = records.map((r) => ({
        id: r.id,
        date: r.date.toISOString(),
        studentName: r.student.name,
        studentCode: r.student.studentId,
        courseName: r.course.name,
        status: r.status,
      }));

      // Per-student attendance rate across the filtered set.
      const map = new Map<
        string,
        {
          studentId: string;
          name: string;
          studentCode: string | null;
          present: number;
          total: number;
        }
      >();
      for (const r of records) {
        let entry = map.get(r.student.id);
        if (!entry) {
          entry = {
            studentId: r.student.id,
            name: r.student.name,
            studentCode: r.student.studentId,
            present: 0,
            total: 0,
          };
          map.set(r.student.id, entry);
        }
        entry.total++;
        if (r.status === "PRESENT") entry.present++;
      }
      const summaries = [...map.values()]
        .map((s) => {
          const rate = s.total ? Math.round((s.present / s.total) * 100) : 0;
          return { ...s, rate, belowThreshold: rate < threshold };
        })
        .sort((a, b) => a.rate - b.rate);

      return { rows, summaries, threshold };
    }),

  reportData: adminProcedure
    .input(z.object({ studentId: z.string() }))
    .query(({ input }) => buildReportData(input.studentId)),

  myMonth: studentProcedure
    .input(z.object({ month: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const studentId = ctx.session.user.id;

      // Month window (default current month), month param = YYYY-MM.
      const now = new Date();
      let year = now.getUTCFullYear();
      let month = now.getUTCMonth();
      if (input.month && /^\d{4}-\d{2}$/.test(input.month)) {
        const [y, m] = input.month.split("-").map(Number);
        year = y;
        month = m - 1;
      }
      const monthStart = new Date(Date.UTC(year, month, 1));
      const monthEnd = new Date(Date.UTC(year, month + 1, 1));

      const [records, settings] = await Promise.all([
        prisma.attendance.findMany({
          where: { studentId, date: { gte: monthStart, lt: monthEnd } },
          orderBy: { date: "desc" },
          include: { course: { select: { name: true } } },
        }),
        prisma.schoolSettings.findUnique({ where: { id: "singleton" } }),
      ]);

      const counts = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 };
      const dayStatuses: Record<number, string> = {};
      for (const r of records) {
        counts[r.status] += 1;
        dayStatuses[new Date(r.date).getUTCDate()] = r.status;
      }
      const total = records.length;
      const rate = total ? Math.round((counts.PRESENT / total) * 100) : 0;
      const threshold = settings?.attendanceThreshold ?? DEFAULT_THRESHOLD;

      return {
        year,
        month,
        rows: records.map((r) => ({
          id: r.id,
          date: r.date,
          courseName: r.course.name,
          status: r.status,
        })),
        counts,
        total,
        rate,
        threshold,
        belowThreshold: total > 0 && rate < threshold,
        dayStatuses,
      };
    }),

  myReportData: studentProcedure.query(({ ctx }) =>
    buildReportData(ctx.session.user.id),
  ),
});
