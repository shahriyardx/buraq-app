import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  computeProgress,
  dateKey,
  loadBookedWeekKeys,
  todayUtc,
  toUtcDate,
  weekStartKey,
} from "@/lib/enrollment";
import { prisma } from "@/lib/prisma";
import { createTRPCRouter, studentProcedure } from "../init";

const MAX_HORIZON_DAYS = 120; // safety cap on occurrence generation

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

      // How far to generate occurrences.
      let horizonDays = MAX_HORIZON_DAYS;
      if (progress.allowedUntil) {
        const diff = Math.ceil(
          (toUtcDate(progress.allowedUntil).getTime() - start.getTime()) /
            86400000,
        );
        horizonDays = Math.min(MAX_HORIZON_DAYS, Math.max(0, diff + 1));
      }

      const slotIds = e.course.slots.map((s) => s.id);
      const [allBookings, myBookings] = await Promise.all([
        prisma.slotBooking.groupBy({
          by: ["slotId", "date"],
          where: { slotId: { in: slotIds }, date: { gte: start } },
          _count: { _all: true },
        }),
        prisma.slotBooking.findMany({
          where: {
            studentId,
            slot: { courseId: e.courseId },
            date: { gte: start },
          },
          select: { id: true, slotId: true, date: true },
        }),
      ]);
      const usedBy = new Map<string, number>();
      for (const g of allBookings)
        usedBy.set(`${g.slotId}|${dateKey(g.date)}`, g._count._all);
      const mine = new Map<string, string>();
      for (const b of myBookings)
        mine.set(`${b.slotId}|${dateKey(b.date)}`, b.id);

      const occurrences = [];
      if (progress.bookingOpen) {
        for (let i = 0; i < horizonDays; i++) {
          const d = new Date(start);
          d.setUTCDate(start.getUTCDate() + i);
          const wd = d.getUTCDay();
          const dk = dateKey(d);
          for (const s of e.course.slots) {
            if (s.weekday !== wd) continue;
            const key = `${s.id}|${dk}`;
            occurrences.push({
              slotId: s.id,
              date: dk,
              weekday: wd,
              weekStart: weekStartKey(d),
              startTime: s.startTime,
              endTime: s.endTime,
              capacity: s.capacity,
              remaining: Math.max(0, s.capacity - (usedBy.get(key) ?? 0)),
              bookingId: mine.get(key) ?? null,
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
      startTime: b.slot.startTime,
      endTime: b.slot.endTime,
    }));
  }),

  book: studentProcedure
    .input(z.object({ slotId: z.string(), date: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const studentId = ctx.session.user.id;
      const date = toUtcDate(input.date);
      if (Number.isNaN(date.getTime())) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid date." });
      }
      if (date < todayUtc()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot book a past date.",
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

      // Slot capacity on this date.
      const used = await prisma.slotBooking.count({
        where: { slotId: slot.id, date },
      });
      if (used >= slot.capacity) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This slot is full for that date.",
        });
      }

      let bookingId: string;
      try {
        const booking = await prisma.slotBooking.create({
          data: { slotId: slot.id, studentId, date },
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
