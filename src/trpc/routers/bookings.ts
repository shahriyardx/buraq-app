import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  computeProgress,
  dateKey,
  hmToMin,
  loadBookedWeekKeys,
  minToHm,
  subSessions,
  todayUtc,
  toUtcDate,
  weekStartKey,
} from "@/lib/enrollment";
import { prisma } from "@/lib/prisma";
import { createTRPCRouter, studentProcedure } from "../init";

/** Sunday (end) of the week containing `d`, as a yyyy-mm-dd key. */
function weekEndKey(d: Date) {
  const start = toUtcDate(weekStartKey(d));
  start.setUTCDate(start.getUTCDate() + 6);
  return dateKey(start);
}

export const bookingsRouter = createTRPCRouter({
  /**
   * The student's ACTIVE enrollments with their bookable slot occurrences,
   * booking window, and completion progress. Persists status transitions.
   */
  available: studentProcedure.query(async ({ ctx }) => {
    const studentId = ctx.session.user.id;
    const start = todayUtc();

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId, status: { in: ["ACTIVE", "INCOMPLETE"] } },
      include: {
        course: {
          select: {
            id: true,
            name: true,
            durationWeeks: true,
            maxBookingsPerWeek: true,
            slots: { orderBy: [{ weekday: "asc" }, { startTime: "asc" }] },
          },
        },
      },
    });

    const result = [];
    for (const e of enrollments) {
      const bookedWeeks = await loadBookedWeekKeys(studentId, e.courseId);
      const progress = computeProgress(
        {
          id: e.id,
          studentId,
          courseId: e.courseId,
          status: e.status,
          approvedAt: e.approvedAt,
          startDate: e.startDate,
          createdAt: e.createdAt,
          bonusWeeks: e.bonusWeeks,
          course: { durationWeeks: e.course.durationWeeks },
        },
        bookedWeeks,
      );
      if (progress.derivedStatus !== e.status) {
        await prisma.enrollment.update({
          where: { id: e.id },
          data: { status: progress.derivedStatus as never },
        });
      }

      // Bookings are limited to the CURRENT week only (no future weeks), and
      // never beyond the enrollment's allowed window.
      const endKey =
        progress.allowedUntil && progress.allowedUntil < weekEndKey(start)
          ? progress.allowedUntil
          : weekEndKey(start);
      const endDate = toUtcDate(endKey);

      const slotIds = e.course.slots.map((s) => s.id);
      const [allBookings, myBookings] = await Promise.all([
        // Seat usage per (slot, date, sub-session start).
        prisma.slotBooking.groupBy({
          by: ["slotId", "date", "startTime"],
          where: { slotId: { in: slotIds }, date: { gte: start } },
          _count: { _all: true },
        }),
        prisma.slotBooking.findMany({
          where: {
            studentId,
            slot: { courseId: e.courseId },
            date: { gte: start },
          },
          select: { id: true, slotId: true, date: true, startTime: true },
        }),
      ]);
      const usedBy = new Map<string, number>();
      for (const g of allBookings)
        usedBy.set(
          `${g.slotId}|${dateKey(g.date)}|${g.startTime}`,
          g._count._all,
        );
      const mine = new Map<string, { id: string; startTime: string }>();
      for (const b of myBookings)
        mine.set(`${b.slotId}|${dateKey(b.date)}`, {
          id: b.id,
          startTime: b.startTime,
        });

      const occurrences = [];
      if (progress.bookingOpen) {
        for (
          const d = new Date(start);
          d <= endDate;
          d.setUTCDate(d.getUTCDate() + 1)
        ) {
          const wd = d.getUTCDay();
          const dk = dateKey(d);
          for (const s of e.course.slots) {
            if (s.weekday !== wd) continue;
            const myBooking = mine.get(`${s.id}|${dk}`) ?? null;
            const sessions = subSessions(
              s.startTime,
              s.endTime,
              s.sessionMinutes,
            ).map((ss) => {
              const used = usedBy.get(`${s.id}|${dk}|${ss.start}`) ?? 0;
              return {
                start: ss.start,
                end: ss.end,
                remaining: Math.max(0, s.capacity - used),
                mine: myBooking?.startTime === ss.start,
              };
            });
            occurrences.push({
              slotId: s.id,
              date: dk,
              weekday: wd,
              weekStart: weekStartKey(d),
              windowStart: s.startTime,
              windowEnd: s.endTime,
              sessionMinutes: s.sessionMinutes,
              capacity: s.capacity,
              bookingId: myBooking?.id ?? null,
              bookedStart: myBooking?.startTime ?? null,
              sessions,
            });
          }
        }
      }

      // Student's bookings per week for this course (weekly-limit UI).
      const weekUsage: Record<string, number> = {};
      for (const wk of bookedWeeks) weekUsage[wk] = 0;
      const perWeek = await prisma.slotBooking.findMany({
        where: { studentId, slot: { courseId: e.courseId } },
        select: { date: true },
      });
      for (const b of perWeek) {
        const wk = weekStartKey(b.date);
        weekUsage[wk] = (weekUsage[wk] ?? 0) + 1;
      }

      result.push({
        courseId: e.courseId,
        courseName: e.course.name,
        status: progress.derivedStatus,
        requiredWeeks: progress.requiredWeeks,
        completedWeeks: progress.completedWeeks,
        bonusWeeks: progress.bonusWeeks,
        maxBookingsPerWeek: e.course.maxBookingsPerWeek,
        bookingOpen: progress.bookingOpen,
        currentWeek: progress.currentWeek,
        lastAllowedWeek: progress.lastAllowedWeek,
        occurrences,
        weekUsage,
      });
    }

    return result;
  }),

  mine: studentProcedure.query(async ({ ctx }) => {
    const start = todayUtc();
    const bookings = await prisma.slotBooking.findMany({
      where: { studentId: ctx.session.user.id, date: { gte: start } },
      orderBy: { date: "asc" },
      include: { slot: { include: { course: { select: { name: true } } } } },
    });
    return bookings.map((b) => ({
      id: b.id,
      date: b.date,
      courseName: b.slot.course.name,
      startTime: b.startTime || b.slot.startTime,
      endTime: b.startTime
        ? minToHm(hmToMin(b.startTime) + b.slot.sessionMinutes)
        : b.slot.endTime,
    }));
  }),

  book: studentProcedure
    .input(
      z.object({
        slotId: z.string(),
        date: z.string(),
        startTime: z.string().min(1, "Pick a time"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const studentId = ctx.session.user.id;
      const date = toUtcDate(input.date);
      const today = todayUtc();
      if (Number.isNaN(date.getTime())) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid date." });
      }
      if (date < today) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot book a past date.",
        });
      }
      // Current week only — no future weeks.
      if (weekStartKey(date) !== weekStartKey(today)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You can only book this week's slots.",
        });
      }

      const slot = await prisma.courseSlot.findUnique({
        where: { id: input.slotId },
        include: {
          course: {
            select: {
              id: true,
              durationWeeks: true,
              maxBookingsPerWeek: true,
            },
          },
        },
      });
      if (!slot) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Slot not found." });
      }
      if (slot.weekday !== date.getUTCDay()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "That date does not match this slot's day.",
        });
      }
      // The chosen time must be a valid sub-session of the slot window.
      const validSessions = subSessions(
        slot.startTime,
        slot.endTime,
        slot.sessionMinutes,
      );
      if (!validSessions.some((s) => s.start === input.startTime)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid session time.",
        });
      }

      const enrollment = await prisma.enrollment.findUnique({
        where: {
          studentId_courseId: { studentId, courseId: slot.course.id },
        },
      });
      if (!enrollment) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not enrolled in this course.",
        });
      }

      const bookedWeeks = await loadBookedWeekKeys(studentId, slot.course.id);
      const progress = computeProgress(
        {
          id: enrollment.id,
          studentId,
          courseId: slot.course.id,
          status: enrollment.status,
          approvedAt: enrollment.approvedAt,
          startDate: enrollment.startDate,
          createdAt: enrollment.createdAt,
          bonusWeeks: enrollment.bonusWeeks,
          course: { durationWeeks: slot.course.durationWeeks },
        },
        bookedWeeks,
      );
      if (!progress.bookingOpen) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            progress.derivedStatus === "COMPLETED"
              ? "This course is already completed."
              : progress.derivedStatus === "INCOMPLETE"
                ? "Your booking window has closed. Ask the office for an extra week."
                : "Booking is not open for this course.",
        });
      }
      if (progress.allowedUntil && input.date > progress.allowedUntil) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "That date is outside your booking window.",
        });
      }

      // Weekly limit (this course).
      const wsKey = weekStartKey(date);
      const weekStart = toUtcDate(wsKey);
      const weekEnd = new Date(weekStart);
      weekEnd.setUTCDate(weekStart.getUTCDate() + 7);
      const weekCount = await prisma.slotBooking.count({
        where: {
          studentId,
          date: { gte: weekStart, lt: weekEnd },
          slot: { courseId: slot.course.id },
        },
      });
      if (weekCount >= slot.course.maxBookingsPerWeek) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Weekly limit reached (${slot.course.maxBookingsPerWeek}/week for this course).`,
        });
      }

      // Sub-session capacity (seats at the chosen time on this date).
      const used = await prisma.slotBooking.count({
        where: { slotId: slot.id, date, startTime: input.startTime },
      });
      if (used >= slot.capacity) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "That time is full. Pick another.",
        });
      }

      let bookingId: string;
      try {
        const booking = await prisma.slotBooking.create({
          data: {
            slotId: slot.id,
            studentId,
            date,
            startTime: input.startTime,
          },
        });
        bookingId = booking.id;
      } catch {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You have already booked this slot on that date.",
        });
      }

      // Recompute — this booking may complete a required week.
      bookedWeeks.add(wsKey);
      const after = computeProgress(
        {
          id: enrollment.id,
          studentId,
          courseId: slot.course.id,
          status: enrollment.status,
          approvedAt: enrollment.approvedAt,
          startDate: enrollment.startDate,
          createdAt: enrollment.createdAt,
          bonusWeeks: enrollment.bonusWeeks,
          course: { durationWeeks: slot.course.durationWeeks },
        },
        bookedWeeks,
      );
      if (after.derivedStatus !== enrollment.status) {
        await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: { status: after.derivedStatus as never },
        });
      }

      return { id: bookingId, status: after.derivedStatus };
    }),

  cancel: studentProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const booking = await prisma.slotBooking.findUnique({
        where: { id: input.id },
        select: { studentId: true },
      });
      if (!booking || booking.studentId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await prisma.slotBooking.delete({ where: { id: input.id } });
      return { ok: true };
    }),
});
