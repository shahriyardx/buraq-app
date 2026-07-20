import { prisma } from "@/lib/prisma";
import { adminProcedure, createTRPCRouter, studentProcedure } from "../init";

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

export const dashboardRouter = createTRPCRouter({
  stats: adminProcedure.query(async () => {
    // Date boundaries. Attendance rows use `@db.Date` (UTC midnight), so bucket
    // them in UTC. The 6-month enrollment window is anchored to local months.
    const now = new Date();
    const monthWindowStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const todayUtc = new Date();
    todayUtc.setUTCHours(0, 0, 0, 0);
    const weekWindowStart = new Date(todayUtc);
    weekWindowStart.setUTCDate(weekWindowStart.getUTCDate() - 6);

    const todayLocal = new Date();
    todayLocal.setHours(0, 0, 0, 0);
    const weekAhead = new Date(todayLocal);
    weekAhead.setDate(weekAhead.getDate() + 7);

    const [
      totalStudents,
      activeEnrollments,
      certificatesIssued,
      unpaidInvoices,
      openTickets,
      recentEnrollments,
      recentAttendance,
      recentActivity,
      upcomingClasses,
    ] = await Promise.all([
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.enrollment.count({ where: { status: "ACTIVE" } }),
      prisma.certificate.count(),
      prisma.invoice.count({
        where: { status: { in: ["UNPAID", "OVERDUE"] } },
      }),
      prisma.supportTicket.count({ where: { status: "OPEN" } }),
      prisma.enrollment.findMany({
        where: { createdAt: { gte: monthWindowStart } },
        select: { createdAt: true },
      }),
      prisma.attendance.findMany({
        where: { date: { gte: weekWindowStart } },
        select: { date: true, status: true },
      }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          actorName: true,
          action: true,
          entity: true,
          createdAt: true,
        },
      }),
      prisma.classSession.findMany({
        where: { date: { gte: todayLocal, lte: weekAhead } },
        orderBy: { date: "asc" },
        take: 10,
        select: {
          id: true,
          date: true,
          startTime: true,
          endTime: true,
          instructor: true,
          course: { select: { name: true } },
        },
      }),
    ]);

    // Monthly enrollment buckets (last 6 months, oldest → newest).
    const monthBuckets = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        key: `${d.getFullYear()}-${d.getMonth()}`,
        month: d.toLocaleString("en-US", { month: "short" }),
        count: 0,
      };
    });
    const monthIndex = new Map(monthBuckets.map((b, i) => [b.key, i]));
    for (const { createdAt } of recentEnrollments) {
      const key = `${createdAt.getFullYear()}-${createdAt.getMonth()}`;
      const idx = monthIndex.get(key);
      if (idx !== undefined) monthBuckets[idx].count += 1;
    }
    const enrollmentData = monthBuckets.map(({ month, count }) => ({
      month,
      count,
    }));

    // Weekly attendance rate buckets (last 7 days, oldest → newest).
    const dayBuckets = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(todayUtc);
      d.setUTCDate(d.getUTCDate() - (6 - i));
      return {
        key: dayKey(d),
        day: d.toLocaleDateString("en-US", {
          weekday: "short",
          timeZone: "UTC",
        }),
        present: 0,
        total: 0,
      };
    });
    const dayIndex = new Map(dayBuckets.map((b, i) => [b.key, i]));
    const todayKey = dayKey(todayUtc);
    let presentToday = 0;
    for (const { date, status } of recentAttendance) {
      const key = dayKey(date);
      if (key === todayKey && status === "PRESENT") presentToday += 1;
      const idx = dayIndex.get(key);
      if (idx === undefined) continue;
      dayBuckets[idx].total += 1;
      if (status === "PRESENT") dayBuckets[idx].present += 1;
    }
    const attendanceData = dayBuckets.map(({ day, present, total }) => ({
      day,
      rate: total > 0 ? Math.round((present / total) * 100) : 0,
    }));

    return {
      totalStudents,
      activeEnrollments,
      certificatesIssued,
      unpaidInvoices,
      openTickets,
      presentToday,
      enrollmentData,
      attendanceData,
      recentActivity: recentActivity.map((log) => ({
        id: log.id,
        actorName: log.actorName,
        action: log.action,
        entity: log.entity,
        createdAt: log.createdAt,
      })),
      upcomingClasses: upcomingClasses.map((s) => ({
        id: s.id,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        instructor: s.instructor,
        courseName: s.course.name,
      })),
    };
  }),

  overview: studentProcedure.query(async ({ ctx }) => {
    const studentId = ctx.session.user.id;

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAhead = new Date(today);
    weekAhead.setDate(weekAhead.getDate() + 30);

    const [student, monthAttendance, activeEnrollment, certCount] =
      await Promise.all([
        prisma.user.findUnique({
          where: { id: studentId },
          select: { name: true, photoUrl: true, studentId: true, status: true },
        }),
        prisma.attendance.findMany({
          where: { studentId, date: { gte: monthStart } },
          select: { status: true },
        }),
        prisma.enrollment.findFirst({
          where: { studentId, status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
          include: { course: true },
        }),
        prisma.certificate.count({ where: { studentId, status: "VALID" } }),
      ]);

    const counts = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 };
    for (const a of monthAttendance) counts[a.status] += 1;
    const total = monthAttendance.length;
    const rate = total ? Math.round((counts.PRESENT / total) * 100) : 0;

    // Upcoming classes for the student's enrolled courses.
    const enrolledCourseIds = (
      await prisma.enrollment.findMany({
        where: { studentId, status: { in: ["ACTIVE", "COMPLETED"] } },
        select: { courseId: true },
      })
    ).map((e) => e.courseId);
    const upcomingRows = enrolledCourseIds.length
      ? await prisma.classSession.findMany({
          where: {
            courseId: { in: enrolledCourseIds },
            date: { gte: today, lte: weekAhead },
          },
          orderBy: { date: "asc" },
          take: 3,
          include: { course: { select: { name: true } } },
        })
      : [];

    return {
      student: student
        ? {
            name: student.name,
            photoUrl: student.photoUrl,
            studentId: student.studentId,
            status: student.status,
          }
        : null,
      counts,
      total,
      rate,
      certCount,
      activeEnrollment: activeEnrollment
        ? {
            courseName: activeEnrollment.course.name,
            level: activeEnrollment.course.level,
            instructor: activeEnrollment.course.instructor,
            progress: activeEnrollment.progress,
          }
        : null,
      upcoming: upcomingRows.map((s) => ({
        id: s.id,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        courseName: s.course.name,
      })),
    };
  }),
});
