import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { toAttendanceDate } from "@/app/(admin)/admin/attendance/date";
import { logAction } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { createTRPCRouter, instructorProcedure } from "../init";

const statusEnum = z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]);

/** Throws unless the course is taught by this instructor. */
async function assertOwnsCourse(instructorId: string, courseId: string) {
  const course = await prisma.course.findFirst({
    where: { id: courseId, instructorUserId: instructorId },
    select: { id: true, name: true },
  });
  if (!course) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You are not assigned to this course.",
    });
  }
  return course;
}

export const instructorRouter = createTRPCRouter({
  dashboard: instructorProcedure.query(async ({ ctx }) => {
    const instructorId = ctx.session.user.id;
    const [courses, upcoming, studentCount] = await Promise.all([
      prisma.course.findMany({
        where: { instructorUserId: instructorId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          status: true,
          _count: { select: { enrollments: true } },
        },
      }),
      prisma.classSession.findMany({
        where: {
          instructorUserId: instructorId,
          date: { gte: new Date(new Date().toISOString().slice(0, 10)) },
        },
        orderBy: { date: "asc" },
        take: 8,
        include: { course: { select: { name: true } } },
      }),
      prisma.enrollment
        .findMany({
          where: {
            status: "ACTIVE",
            course: { instructorUserId: instructorId },
          },
          select: { studentId: true },
          distinct: ["studentId"],
        })
        .then((rows) => rows.length),
    ]);

    return {
      courseCount: courses.length,
      activeCourseCount: courses.filter((c) => c.status === "ACTIVE").length,
      studentCount,
      upcomingCount: upcoming.length,
      courses: courses.map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        enrolledCount: c._count.enrollments,
      })),
      upcoming: upcoming.map((s) => ({
        id: s.id,
        courseName: s.course.name,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
    };
  }),

  courses: instructorProcedure.query(async ({ ctx }) => {
    const courses = await prisma.course.findMany({
      where: { instructorUserId: ctx.session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        level: true,
        schedule: true,
        status: true,
        _count: { select: { enrollments: true } },
      },
    });
    return courses.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      level: c.level,
      schedule: c.schedule,
      status: c.status,
      enrolledCount: c._count.enrollments,
    }));
  }),

  /** Active courses this instructor teaches — for attendance/schedule selects. */
  courseOptions: instructorProcedure.query(async ({ ctx }) => {
    return prisma.course.findMany({
      where: { instructorUserId: ctx.session.user.id, status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
  }),

  courseRoster: instructorProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertOwnsCourse(ctx.session.user.id, input.courseId);
      const enrollments = await prisma.enrollment.findMany({
        where: { courseId: input.courseId },
        include: {
          student: {
            select: { id: true, name: true, studentId: true, email: true },
          },
        },
        orderBy: { student: { name: "asc" } },
      });
      return enrollments.map((e) => ({
        studentId: e.student.id,
        name: e.student.name,
        studentCode: e.student.studentId,
        email: e.student.email,
        progress: e.progress,
        status: e.status,
      }));
    }),

  schedule: instructorProcedure.query(async ({ ctx }) => {
    const sessions = await prisma.classSession.findMany({
      where: { instructorUserId: ctx.session.user.id },
      orderBy: { date: "desc" },
      include: { course: { select: { name: true } } },
    });
    return sessions.map((s) => ({
      id: s.id,
      courseName: s.course.name,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
    }));
  }),

  students: instructorProcedure.query(async ({ ctx }) => {
    const enrollments = await prisma.enrollment.findMany({
      where: { course: { instructorUserId: ctx.session.user.id } },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            studentId: true,
            email: true,
            phone: true,
            status: true,
          },
        },
        course: { select: { name: true } },
      },
      orderBy: { student: { name: "asc" } },
    });
    // Group courses per student.
    const byId = new Map<
      string,
      {
        id: string;
        name: string;
        studentCode: string | null;
        email: string;
        phone: string | null;
        status: string;
        courses: string[];
      }
    >();
    for (const e of enrollments) {
      const existing = byId.get(e.student.id);
      if (existing) {
        existing.courses.push(e.course.name);
      } else {
        byId.set(e.student.id, {
          id: e.student.id,
          name: e.student.name,
          studentCode: e.student.studentId,
          email: e.student.email,
          phone: e.student.phone,
          status: e.student.status,
          courses: [e.course.name],
        });
      }
    }
    return [...byId.values()];
  }),

  // ─── Attendance (scoped to taught courses) ────────────────────────────────

  roster: instructorProcedure
    .input(z.object({ courseId: z.string(), date: z.string() }))
    .query(async ({ ctx, input }) => {
      const date = toAttendanceDate(input.date);
      if (!input.courseId || !date) return [];
      await assertOwnsCourse(ctx.session.user.id, input.courseId);

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

  saveAttendance: instructorProcedure
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
      await assertOwnsCourse(ctx.session.user.id, input.courseId);

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
        if (!status) continue;
        const prevRecord = byStudent.get(studentId);
        if (prevRecord && prevRecord.status === status) continue;

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
        detail: `${changed} record${changed === 1 ? "" : "s"} for ${input.date} (instructor)`,
      });
      return { changed };
    }),

  // ─── Self profile ─────────────────────────────────────────────────────────

  me: instructorProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        name: true,
        email: true,
        instructorId: true,
        phone: true,
        address: true,
        bio: true,
        specialties: true,
        photoUrl: true,
        emailNotifications: true,
      },
    });
    return {
      name: user?.name ?? "",
      email: user?.email ?? "",
      instructorId: user?.instructorId ?? null,
      phone: user?.phone ?? null,
      address: user?.address ?? null,
      bio: user?.bio ?? null,
      specialties: user?.specialties ?? null,
      photoUrl: user?.photoUrl ?? null,
      emailNotifications: user?.emailNotifications ?? true,
    };
  }),

  updateProfile: instructorProcedure
    .input(
      z.object({
        phone: z.string().nullish(),
        address: z.string().nullish(),
        bio: z.string().nullish(),
        specialties: z.string().nullish(),
        photoUrl: z.string().url().nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await prisma.user.update({
        where: { id: ctx.session.user.id },
        data: {
          phone: input.phone ?? null,
          address: input.address ?? null,
          bio: input.bio ?? null,
          specialties: input.specialties ?? null,
          ...(input.photoUrl ? { photoUrl: input.photoUrl } : {}),
        },
      });
      return { ok: true };
    }),

  updateNotifications: instructorProcedure
    .input(z.object({ emailNotifications: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await prisma.user.update({
        where: { id: ctx.session.user.id },
        data: { emailNotifications: input.emailNotifications },
      });
      return { ok: true };
    }),
});
