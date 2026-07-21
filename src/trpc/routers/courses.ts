import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { logAction } from "@/lib/audit";
import { enrollStudent } from "@/lib/enrollments";
import { generateInvoiceNumber } from "@/lib/ids";
import { notifyStudent } from "@/lib/notify";
import { prisma } from "@/lib/prisma";
import { adminProcedure, createTRPCRouter, studentProcedure } from "../init";

const courseInput = z.object({
  name: z.string().min(2, "Name is required"),
  description: z.string().nullish(),
  level: z.string().nullish(),
  durationWeeks: z.number().int().min(0, "Duration must be positive").nullish(),
  price: z.number().min(0, "Price must be positive"),
  schedule: z.string().nullish(),
  maxStudents: z
    .number()
    .int()
    .min(0, "Max students must be positive")
    .nullish(),
  instructor: z.string().nullish(), // manual fallback when no account is linked
  instructorUserId: z.string().nullish(),
});

/**
 * Builds the persisted course row. When an instructor account is linked, the
 * `instructor` display string is mirrored from that user's name so all the
 * existing name-based views keep working.
 */
async function courseData(input: z.infer<typeof courseInput>) {
  let instructorUserId = input.instructorUserId ?? null;
  let instructor = input.instructor ?? null;
  if (instructorUserId) {
    const user = await prisma.user.findFirst({
      where: { id: instructorUserId, role: "INSTRUCTOR" },
      select: { name: true },
    });
    if (!user) instructorUserId = null;
    else instructor = user.name;
  }
  return {
    name: input.name,
    description: input.description ?? null,
    level: input.level ?? null,
    durationWeeks: input.durationWeeks ?? null,
    price: input.price,
    schedule: input.schedule ?? null,
    maxStudents: input.maxStudents ?? null,
    instructor,
    instructorUserId,
  };
}

export const coursesRouter = createTRPCRouter({
  list: adminProcedure.query(async () => {
    const courses = await prisma.course.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        level: true,
        durationWeeks: true,
        price: true,
        schedule: true,
        maxStudents: true,
        instructor: true,
        instructorUserId: true,
        status: true,
        _count: { select: { enrollments: true } },
      },
    });
    return courses.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      level: c.level,
      durationWeeks: c.durationWeeks,
      price: c.price.toString(),
      schedule: c.schedule,
      maxStudents: c.maxStudents,
      instructor: c.instructor,
      instructorUserId: c.instructorUserId,
      status: c.status,
      enrolledCount: c._count.enrollments,
    }));
  }),

  get: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const course = await prisma.course.findUnique({
        where: { id: input.id },
        include: {
          enrollments: {
            include: { student: { select: { id: true, name: true } } },
            orderBy: { createdAt: "desc" },
          },
        },
      });
      if (!course) throw new TRPCError({ code: "NOT_FOUND" });

      const enrolledIds = new Set(course.enrollments.map((e) => e.studentId));
      const students = await prisma.user.findMany({
        where: { role: "STUDENT", status: "ACTIVE" },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      });
      const available = students.filter((s) => !enrolledIds.has(s.id));

      return {
        id: course.id,
        name: course.name,
        description: course.description,
        level: course.level,
        durationWeeks: course.durationWeeks,
        price: course.price.toString(),
        schedule: course.schedule,
        maxStudents: course.maxStudents,
        instructor: course.instructor,
        instructorUserId: course.instructorUserId,
        status: course.status,
        createdAt: course.createdAt,
        enrollments: course.enrollments.map((e) => ({
          id: e.id,
          studentId: e.student.id,
          studentName: e.student.name,
          progress: e.progress,
          status: e.status,
        })),
        available,
      };
    }),

  create: adminProcedure.input(courseInput).mutation(async ({ ctx, input }) => {
    const course = await prisma.course.create({
      data: await courseData(input),
    });
    await logAction({
      actorId: ctx.session.user.id,
      actorName: ctx.session.user.name,
      action: "course.create",
      entity: "Course",
      entityId: course.id,
      detail: course.name,
    });
    return { id: course.id, name: course.name };
  }),

  update: adminProcedure
    .input(courseInput.extend({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await prisma.course.update({
        where: { id: input.id },
        data: await courseData(input),
      });
      await logAction({
        actorId: ctx.session.user.id,
        actorName: ctx.session.user.name,
        action: "course.update",
        entity: "Course",
        entityId: input.id,
      });
      return { ok: true };
    }),

  setStatus: adminProcedure
    .input(z.object({ id: z.string(), status: z.enum(["ACTIVE", "ARCHIVED"]) }))
    .mutation(async ({ ctx, input }) => {
      await prisma.course.update({
        where: { id: input.id },
        data: { status: input.status },
      });
      await logAction({
        actorId: ctx.session.user.id,
        actorName: ctx.session.user.name,
        action:
          input.status === "ACTIVE" ? "course.activate" : "course.archive",
        entity: "Course",
        entityId: input.id,
      });
      return { ok: true };
    }),

  enroll: adminProcedure
    .input(z.object({ courseId: z.string(), studentId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await enrollStudent({
        studentId: input.studentId,
        courseId: input.courseId,
      });
      await logAction({
        actorId: ctx.session.user.id,
        actorName: ctx.session.user.name,
        action: "course.enroll",
        entity: "Enrollment",
        entityId: input.courseId,
        detail: input.studentId,
      });
      return { ok: true };
    }),

  pendingEnrollments: adminProcedure.query(async () => {
    const pending = await prisma.enrollment.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: {
        student: { select: { name: true } },
        course: { select: { name: true } },
      },
    });
    return pending.map((e) => ({
      id: e.id,
      studentName: e.student.name,
      courseName: e.course.name,
      requestedAt: e.createdAt,
    }));
  }),

  approveEnrollment: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const enrollment = await prisma.enrollment.findUnique({
        where: { id: input.id },
        include: { course: true },
      });
      if (!enrollment || enrollment.status !== "PENDING") {
        return { ok: false };
      }

      await prisma.enrollment.update({
        where: { id: input.id },
        data: { status: "ACTIVE", startDate: new Date() },
      });

      // Auto-invoice on approval (the enrollment row already existed, so the
      // enrollStudent helper's create-time invoice didn't fire).
      if (Number(enrollment.course.price) > 0) {
        const due = new Date();
        due.setDate(due.getDate() + 14);
        await prisma.invoice.create({
          data: {
            invoiceNumber: generateInvoiceNumber(),
            studentId: enrollment.studentId,
            courseId: enrollment.courseId,
            amount: enrollment.course.price,
            dueDate: due,
            status: "UNPAID",
          },
        });
      }

      await notifyStudent({
        studentId: enrollment.studentId,
        templateKey: "ENROLLMENT",
        vars: { courseName: enrollment.course.name },
      });

      await logAction({
        actorId: ctx.session.user.id,
        actorName: ctx.session.user.name,
        action: "enrollment.approve",
        entity: "Enrollment",
        entityId: input.id,
        detail: enrollment.studentId,
      });
      return { ok: true };
    }),

  rejectEnrollment: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await prisma.enrollment.update({
        where: { id: input.id },
        data: { status: "CANCELLED" },
      });
      await logAction({
        actorId: ctx.session.user.id,
        actorName: ctx.session.user.name,
        action: "enrollment.reject",
        entity: "Enrollment",
        entityId: input.id,
      });
      return { ok: true };
    }),

  // ── Class schedule ────────────────────────────────────────────────────────
  classSessions: adminProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ input }) => {
      const sessions = await prisma.classSession.findMany({
        where: { courseId: input.courseId },
        orderBy: { date: "asc" },
      });
      return sessions.map((s) => ({
        id: s.id,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        instructor: s.instructor,
      }));
    }),

  addClassSession: adminProcedure
    .input(
      z.object({
        courseId: z.string(),
        date: z.string().min(1, "Date is required"),
        startTime: z.string().nullish(),
        endTime: z.string().nullish(),
        instructor: z.string().nullish(),
        instructorUserId: z.string().nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const date = new Date(input.date);
      if (Number.isNaN(date.getTime())) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid date." });
      }
      let instructorUserId = input.instructorUserId || null;
      let instructor = input.instructor || null;
      if (instructorUserId) {
        const user = await prisma.user.findFirst({
          where: { id: instructorUserId, role: "INSTRUCTOR" },
          select: { name: true },
        });
        if (!user) instructorUserId = null;
        else instructor = user.name;
      }
      const session = await prisma.classSession.create({
        data: {
          courseId: input.courseId,
          date,
          startTime: input.startTime || null,
          endTime: input.endTime || null,
          instructor,
          instructorUserId,
        },
      });
      await logAction({
        actorId: ctx.session.user.id,
        actorName: ctx.session.user.name,
        action: "class_session.add",
        entity: "ClassSession",
        entityId: session.id,
      });
      return { id: session.id };
    }),

  deleteClassSession: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await prisma.classSession.delete({ where: { id: input.id } });
      await logAction({
        actorId: ctx.session.user.id,
        actorName: ctx.session.user.name,
        action: "class_session.delete",
        entity: "ClassSession",
        entityId: input.id,
      });
      return { ok: true };
    }),

  myCourses: studentProcedure.query(async ({ ctx }) => {
    const studentId = ctx.session.user.id;
    const [enrollments, activeCourses, certificates] = await Promise.all([
      prisma.enrollment.findMany({
        where: { studentId },
        include: { course: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.course.findMany({
        where: { status: "ACTIVE" },
        orderBy: { name: "asc" },
      }),
      prisma.certificate.findMany({
        where: { studentId, status: "VALID" },
        select: { courseId: true },
      }),
    ]);

    const enrollmentStatusByCourse = new Map(
      enrollments.map((e) => [e.courseId, e.status]),
    );
    const certifiedCourses = new Set(certificates.map((c) => c.courseId));

    const current = enrollments
      .filter((e) => e.status === "ACTIVE")
      .map((e) => ({
        id: e.id,
        status: e.status,
        progress: e.progress,
        startDate: e.startDate,
        endDate: e.endDate,
        course: {
          name: e.course.name,
          description: e.course.description,
          instructor: e.course.instructor,
          schedule: e.course.schedule,
        },
      }));

    const history = enrollments
      .filter((e) => e.status === "COMPLETED")
      .map((e) => ({
        id: e.id,
        status: e.status,
        endDate: e.endDate,
        courseId: e.courseId,
        courseName: e.course.name,
        certified: certifiedCourses.has(e.courseId),
      }));

    // Active courses the student isn't already in (ACTIVE/COMPLETED). Courses
    // with a PENDING request stay in the list so we can show a disabled
    // "Requested".
    const browse = activeCourses
      .filter((c) => {
        const status = enrollmentStatusByCourse.get(c.id);
        return status !== "ACTIVE" && status !== "COMPLETED";
      })
      .map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        level: c.level,
        instructor: c.instructor,
        price: c.price.toString(),
        requested: enrollmentStatusByCourse.get(c.id) === "PENDING",
      }));

    return { current, history, browse };
  }),

  requestEnrollment: studentProcedure
    .input(z.object({ courseId: z.string().min(1, "Course is required") }))
    .mutation(async ({ ctx, input }) => {
      const studentId = ctx.session.user.id;
      const { courseId } = input;

      const course = await prisma.course.findUnique({
        where: { id: courseId },
      });
      if (!course || course.status !== "ACTIVE") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This course is not open for enrollment.",
        });
      }

      const existing = await prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId, courseId } },
      });
      if (existing && existing.status !== "CANCELLED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            existing.status === "PENDING"
              ? "You have already requested this course."
              : "You are already enrolled in this course.",
        });
      }

      // Re-requesting a previously cancelled enrollment reuses the row (the
      // (student, course) pair is unique); otherwise create a fresh request.
      if (existing) {
        await prisma.enrollment.update({
          where: { id: existing.id },
          data: {
            status: "PENDING",
            progress: 0,
            startDate: null,
            endDate: null,
          },
        });
      } else {
        await prisma.enrollment.create({
          data: { studentId, courseId, status: "PENDING" },
        });
      }

      return {
        ok: true,
        message: `Enrollment requested for ${course.name}. Awaiting admin approval.`,
      };
    }),
});
