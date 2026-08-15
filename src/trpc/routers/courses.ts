import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { logAction } from "@/lib/audit";
import {
  computeProgress,
  loadBookedWeekKeys,
  subSessions,
} from "@/lib/enrollment";
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
  maxBookingsPerWeek: z
    .number()
    .int()
    .min(1, "Must allow at least 1 booking per week")
    .default(1),
  enrollmentPaused: z.boolean().default(false),
  instructor: z.string().nullish(), // manual fallback when no account is linked
  instructorUserId: z.string().nullish(),
});

const slotInput = z.object({
  weekday: z.number().int().min(0).max(6),
  startTime: z.string().min(1, "Start time required"),
  endTime: z.string().min(1, "End time required"),
  sessionMinutes: z.number().int().min(5).max(480).default(30),
  // One rider per sub-session. Kept for flexibility; forms always send 1.
  capacity: z.number().int().min(1).default(1),
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
    maxBookingsPerWeek: input.maxBookingsPerWeek ?? 1,
    enrollmentPaused: input.enrollmentPaused ?? false,
    instructor,
    instructorUserId,
  };
}

/** Re-derives and persists an enrollment's status after a booking change. */
async function recomputeEnrollmentStatus(studentId: string, courseId: string) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { studentId_courseId: { studentId, courseId } },
    include: { course: { select: { durationWeeks: true } } },
  });
  if (!enrollment) return;
  const booked = await loadBookedWeekKeys(studentId, courseId);
  const p = computeProgress(
    {
      id: enrollment.id,
      studentId,
      courseId,
      status: enrollment.status,
      approvedAt: enrollment.approvedAt,
      startDate: enrollment.startDate,
      createdAt: enrollment.createdAt,
      bonusWeeks: enrollment.bonusWeeks,
      course: { durationWeeks: enrollment.course.durationWeeks },
    },
    booked,
  );
  if (p.derivedStatus !== enrollment.status) {
    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { status: p.derivedStatus as never },
    });
  }
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
        maxBookingsPerWeek: true,
        enrollmentPaused: true,
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
      maxBookingsPerWeek: c.maxBookingsPerWeek,
      enrollmentPaused: c.enrollmentPaused,
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
          slots: { orderBy: [{ weekday: "asc" }, { startTime: "asc" }] },
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

      // Derive each enrollment's booking-window progress + persist transitions.
      const progressById = new Map<
        string,
        Awaited<ReturnType<typeof computeProgress>>
      >();
      await Promise.all(
        course.enrollments.map(async (e) => {
          const booked = await loadBookedWeekKeys(e.studentId, course.id);
          const p = computeProgress(
            {
              id: e.id,
              studentId: e.studentId,
              courseId: course.id,
              status: e.status,
              approvedAt: e.approvedAt,
              startDate: e.startDate,
              createdAt: e.createdAt,
              bonusWeeks: e.bonusWeeks,
              course: { durationWeeks: course.durationWeeks },
            },
            booked,
          );
          progressById.set(e.id, p);
          if (p.derivedStatus !== e.status) {
            await prisma.enrollment.update({
              where: { id: e.id },
              data: { status: p.derivedStatus as never },
            });
          }
        }),
      );

      return {
        id: course.id,
        name: course.name,
        description: course.description,
        level: course.level,
        durationWeeks: course.durationWeeks,
        price: course.price.toString(),
        schedule: course.schedule,
        maxStudents: course.maxStudents,
        maxBookingsPerWeek: course.maxBookingsPerWeek,
        enrollmentPaused: course.enrollmentPaused,
        instructor: course.instructor,
        instructorUserId: course.instructorUserId,
        status: course.status,
        createdAt: course.createdAt,
        enrollments: course.enrollments.map((e) => {
          const p = progressById.get(e.id);
          return {
            id: e.id,
            studentId: e.student.id,
            studentName: e.student.name,
            progress: e.progress,
            status: p?.derivedStatus ?? e.status,
            requiredWeeks: p?.requiredWeeks ?? 0,
            completedWeeks: p?.completedWeeks ?? 0,
            bonusWeeks: p?.bonusWeeks ?? e.bonusWeeks,
          };
        }),
        slots: course.slots.map((s) => ({
          id: s.id,
          weekday: s.weekday,
          startTime: s.startTime,
          endTime: s.endTime,
          capacity: s.capacity,
        })),
        available,
      };
    }),

  create: adminProcedure
    .input(courseInput.extend({ slots: z.array(slotInput).optional() }))
    .mutation(async ({ ctx, input }) => {
      const course = await prisma.course.create({
        data: await courseData(input),
      });
      if (input.slots?.length) {
        await prisma.courseSlot.createMany({
          data: input.slots.map((s) => ({ courseId: course.id, ...s })),
        });
      }
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
    .input(
      z.object({
        courseId: z.string(),
        studentId: z.string().min(1),
        // "paid" = invoice auto-paid + active now; "pay" = student must pay.
        mode: z.enum(["paid", "pay"]).default("paid"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await enrollStudent({
        studentId: input.studentId,
        courseId: input.courseId,
        status: input.mode === "paid" ? "ACTIVE" : "PENDING",
        invoicePaid: input.mode === "paid",
      });
      await logAction({
        actorId: ctx.session.user.id,
        actorName: ctx.session.user.name,
        action: "course.enroll",
        entity: "Enrollment",
        entityId: input.courseId,
        detail: `${input.studentId} (${input.mode})`,
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

      const now = new Date();
      await prisma.enrollment.update({
        where: { id: input.id },
        data: { status: "ACTIVE", startDate: now, approvedAt: now },
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

  // ─── Training slots (recurring weekly templates) ──────────────────────────
  slots: adminProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ input }) => {
      const slots = await prisma.courseSlot.findMany({
        where: { courseId: input.courseId },
        orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
        include: { _count: { select: { bookings: true } } },
      });
      return slots.map((s) => ({
        id: s.id,
        weekday: s.weekday,
        startTime: s.startTime,
        endTime: s.endTime,
        sessionMinutes: s.sessionMinutes,
        capacity: s.capacity,
        bookingCount: s._count.bookings,
      }));
    }),

  addSlot: adminProcedure
    .input(slotInput.extend({ courseId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (input.endTime <= input.startTime) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "End time must be after start time.",
        });
      }
      const slot = await prisma.courseSlot.create({
        data: {
          courseId: input.courseId,
          weekday: input.weekday,
          startTime: input.startTime,
          endTime: input.endTime,
          sessionMinutes: input.sessionMinutes,
          capacity: input.capacity,
        },
      });
      await logAction({
        actorId: ctx.session.user.id,
        actorName: ctx.session.user.name,
        action: "course_slot.add",
        entity: "CourseSlot",
        entityId: slot.id,
      });
      return { id: slot.id };
    }),

  deleteSlot: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Cascades to bookings on this slot.
      await prisma.courseSlot.delete({ where: { id: input.id } });
      await logAction({
        actorId: ctx.session.user.id,
        actorName: ctx.session.user.name,
        action: "course_slot.delete",
        entity: "CourseSlot",
        entityId: input.id,
      });
      return { ok: true };
    }),

  /** Grant an enrollment one more bookable week (reopens if INCOMPLETE). */
  grantExtraWeek: adminProcedure
    .input(
      z.object({
        enrollmentId: z.string(),
        weeks: z.number().int().min(1).default(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const current = await prisma.enrollment.findUnique({
        where: { id: input.enrollmentId },
        select: { status: true },
      });
      if (!current) throw new TRPCError({ code: "NOT_FOUND" });
      const enrollment = await prisma.enrollment.update({
        where: { id: input.enrollmentId },
        data: {
          bonusWeeks: { increment: input.weeks },
          // Reopen only a closed (INCOMPLETE) window; never un-complete.
          ...(current.status === "INCOMPLETE"
            ? { status: "ACTIVE" as const }
            : {}),
        },
      });
      await logAction({
        actorId: ctx.session.user.id,
        actorName: ctx.session.user.name,
        action: "enrollment.grant_week",
        entity: "Enrollment",
        entityId: enrollment.id,
        detail: `+${input.weeks} week(s)`,
      });
      return { ok: true };
    }),

  // ─── Calendar (per course, one month) ─────────────────────────────────────
  calendar: adminProcedure
    .input(
      z.object({
        courseId: z.string(),
        year: z.number().int(),
        month: z.number().int().min(1).max(12), // 1-12
      }),
    )
    .query(async ({ input }) => {
      const course = await prisma.course.findUnique({
        where: { id: input.courseId },
        include: {
          slots: { orderBy: [{ weekday: "asc" }, { startTime: "asc" }] },
          enrollments: {
            where: { status: { in: ["ACTIVE", "COMPLETED", "INCOMPLETE"] } },
            include: { student: { select: { id: true, name: true } } },
          },
        },
      });
      if (!course) throw new TRPCError({ code: "NOT_FOUND" });

      const monthStart = new Date(Date.UTC(input.year, input.month - 1, 1));
      const monthEnd = new Date(Date.UTC(input.year, input.month, 1));

      const bookings = course.slots.length
        ? await prisma.slotBooking.findMany({
            where: {
              slotId: { in: course.slots.map((s) => s.id) },
              date: { gte: monthStart, lt: monthEnd },
            },
            include: { student: { select: { id: true, name: true } } },
          })
        : [];
      type Booking = {
        bookingId: string;
        studentId: string;
        studentName: string;
      };
      // key = slotId|date|sessionStart
      const bySession = new Map<string, Booking[]>();
      for (const b of bookings) {
        const key = `${b.slotId}|${b.date.toISOString().slice(0, 10)}|${b.startTime}`;
        const arr = bySession.get(key) ?? [];
        arr.push({
          bookingId: b.id,
          studentId: b.student.id,
          studentName: b.student.name,
        });
        bySession.set(key, arr);
      }

      // Build day → slots → sessions for every date with a slot.
      const daysInMonth = new Date(
        Date.UTC(input.year, input.month, 0),
      ).getUTCDate();
      const days: {
        date: string;
        slots: {
          slotId: string;
          windowStart: string;
          windowEnd: string;
          sessionMinutes: number;
          capacity: number;
          bookedCount: number;
          sessions: {
            start: string;
            end: string;
            capacity: number;
            bookings: Booking[];
          }[];
        }[];
      }[] = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(Date.UTC(input.year, input.month - 1, d));
        const dk = date.toISOString().slice(0, 10);
        const wd = date.getUTCDay();
        const slots = course.slots
          .filter((s) => s.weekday === wd)
          .map((s) => {
            const sessions = subSessions(
              s.startTime,
              s.endTime,
              s.sessionMinutes,
            ).map((ss) => ({
              start: ss.start,
              end: ss.end,
              capacity: s.capacity,
              bookings: bySession.get(`${s.id}|${dk}|${ss.start}`) ?? [],
            }));
            return {
              slotId: s.id,
              windowStart: s.startTime,
              windowEnd: s.endTime,
              sessionMinutes: s.sessionMinutes,
              capacity: s.capacity,
              bookedCount: sessions.reduce((n, x) => n + x.bookings.length, 0),
              sessions,
            };
          });
        if (slots.length) days.push({ date: dk, slots });
      }

      return {
        courseName: course.name,
        enrolledStudents: course.enrollments.map((e) => ({
          id: e.student.id,
          name: e.student.name,
        })),
        days,
      };
    }),

  /** Admin directly books a slot for an enrolled student (capacity-checked). */
  assignSlot: adminProcedure
    .input(
      z.object({
        slotId: z.string(),
        date: z.string(),
        startTime: z.string().min(1),
        studentId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const date = new Date(`${input.date}T00:00:00.000Z`);
      if (Number.isNaN(date.getTime())) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid date." });
      }
      const slot = await prisma.courseSlot.findUnique({
        where: { id: input.slotId },
        select: {
          id: true,
          weekday: true,
          startTime: true,
          endTime: true,
          sessionMinutes: true,
          capacity: true,
          courseId: true,
        },
      });
      if (!slot) throw new TRPCError({ code: "NOT_FOUND" });
      if (slot.weekday !== date.getUTCDay()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "That date does not match the slot's day.",
        });
      }
      const sessions = subSessions(
        slot.startTime,
        slot.endTime,
        slot.sessionMinutes,
      );
      if (!sessions.some((s) => s.start === input.startTime)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid session time.",
        });
      }
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          studentId_courseId: {
            studentId: input.studentId,
            courseId: slot.courseId,
          },
        },
      });
      if (!enrollment) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Student is not enrolled in this course.",
        });
      }
      const used = await prisma.slotBooking.count({
        where: { slotId: slot.id, date, startTime: input.startTime },
      });
      if (used >= slot.capacity) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "That session time is full.",
        });
      }
      try {
        await prisma.slotBooking.create({
          data: {
            slotId: slot.id,
            studentId: input.studentId,
            date,
            startTime: input.startTime,
          },
        });
      } catch {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Student already has this slot on that date.",
        });
      }
      await recomputeEnrollmentStatus(input.studentId, slot.courseId);
      await logAction({
        actorId: ctx.session.user.id,
        actorName: ctx.session.user.name,
        action: "slot.assign",
        entity: "CourseSlot",
        entityId: slot.id,
        detail: `${input.studentId} @ ${input.date}`,
      });
      return { ok: true };
    }),

  removeBooking: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const booking = await prisma.slotBooking.findUnique({
        where: { id: input.id },
        include: { slot: { select: { courseId: true } } },
      });
      if (!booking) throw new TRPCError({ code: "NOT_FOUND" });
      await prisma.slotBooking.delete({ where: { id: input.id } });
      await recomputeEnrollmentStatus(booking.studentId, booking.slot.courseId);
      await logAction({
        actorId: ctx.session.user.id,
        actorName: ctx.session.user.name,
        action: "slot.unassign",
        entity: "SlotBooking",
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
        paused: c.enrollmentPaused,
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
      if (course.enrollmentPaused) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Enrollment for this course is paused. Please contact the office.",
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

      const price = Number(course.price);
      const free = price <= 0;

      // Re-requesting a previously cancelled enrollment reuses the row (the
      // (student, course) pair is unique); otherwise create a fresh request.
      // Free courses activate immediately (no payment gate).
      const now = new Date();
      const enrollData = free
        ? { status: "ACTIVE" as const, startDate: now, approvedAt: now }
        : { status: "PENDING" as const, startDate: null, endDate: null };
      if (existing) {
        await prisma.enrollment.update({
          where: { id: existing.id },
          data: { ...enrollData, progress: 0 },
        });
      } else {
        await prisma.enrollment.create({
          data: { studentId, courseId, ...enrollData },
        });
      }

      if (free) {
        return {
          ok: true,
          invoiceId: null,
          message: `Enrolled in ${course.name}. You can now book training slots.`,
        };
      }

      // Reuse an existing open invoice for this course, else create one.
      let invoice = await prisma.invoice.findFirst({
        where: {
          studentId,
          courseId,
          status: { in: ["UNPAID", "OVERDUE", "PROCESSING"] },
        },
        orderBy: { createdAt: "desc" },
      });
      if (!invoice) {
        const due = new Date();
        due.setDate(due.getDate() + 14);
        invoice = await prisma.invoice.create({
          data: {
            invoiceNumber: generateInvoiceNumber(),
            studentId,
            courseId,
            amount: course.price,
            dueDate: due,
            status: "UNPAID",
          },
        });
      }

      return {
        ok: true,
        invoiceId: invoice.id,
        message: `Enrollment requested for ${course.name}. Complete payment to continue.`,
      };
    }),
});
