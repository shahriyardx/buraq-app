"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAction } from "@/lib/audit";
import { requireAdmin } from "@/lib/dal";
import { type ActionState, str } from "@/lib/form";
import { prisma } from "@/lib/prisma";
import { toAttendanceDate } from "./date";

const statusEnum = z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]);

export async function saveAttendanceAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();

  const courseId = str(fd, "courseId");
  const dateStr = str(fd, "date");
  const date = toAttendanceDate(dateStr);
  if (!courseId || !date) {
    return { status: "error", message: "Course and date are required." };
  }

  // The roster is the set of active enrollments — never trust arbitrary
  // form keys as student ids.
  const enrollments = await prisma.enrollment.findMany({
    where: { courseId, status: "ACTIVE" },
    select: { studentId: true },
  });

  const existing = await prisma.attendance.findMany({
    where: { courseId, date },
    select: { id: true, studentId: true, status: true },
  });
  const byStudent = new Map(existing.map((a) => [a.studentId, a]));

  let changed = 0;
  for (const { studentId } of enrollments) {
    const raw = str(fd, studentId);
    if (!raw) continue; // left unmarked
    const parsed = statusEnum.safeParse(raw);
    if (!parsed.success) continue;
    const status = parsed.data;

    const prevRecord = byStudent.get(studentId);
    if (prevRecord && prevRecord.status === status) continue; // no change

    const record = await prisma.attendance.upsert({
      where: { studentId_courseId_date: { studentId, courseId, date } },
      create: { studentId, courseId, date, status, markedBy: session.user.id },
      update: { status, markedBy: session.user.id },
    });
    await prisma.attendanceChangeLog.create({
      data: {
        attendanceId: record.id,
        fromStatus: prevRecord?.status ?? null,
        toStatus: status,
        changedBy: session.user.id,
      },
    });
    changed++;
  }

  await logAction({
    actorId: session.user.id,
    actorName: session.user.name,
    action: "attendance.save",
    entity: "Course",
    entityId: courseId,
    detail: `${changed} record${changed === 1 ? "" : "s"} for ${dateStr}`,
  });

  revalidatePath("/admin/attendance");
  revalidatePath("/admin/attendance/history");
  return {
    status: "success",
    message: changed
      ? `Saved ${changed} attendance record${changed === 1 ? "" : "s"}.`
      : "No changes to save.",
  };
}

export async function editAttendanceAction(
  attendanceId: string,
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();

  const parsed = statusEnum.safeParse(str(fd, "status"));
  if (!parsed.success) {
    return { status: "error", message: "Please choose a valid status." };
  }
  const status = parsed.data;

  const current = await prisma.attendance.findUnique({
    where: { id: attendanceId },
    select: { id: true, status: true },
  });
  if (!current) {
    return { status: "error", message: "Attendance record not found." };
  }

  if (current.status === status) {
    return { status: "success", message: "No change." };
  }

  await prisma.attendance.update({
    where: { id: attendanceId },
    data: { status, markedBy: session.user.id },
  });
  await prisma.attendanceChangeLog.create({
    data: {
      attendanceId,
      fromStatus: current.status,
      toStatus: status,
      changedBy: session.user.id,
    },
  });

  await logAction({
    actorId: session.user.id,
    actorName: session.user.name,
    action: "attendance.edit",
    entity: "Attendance",
    entityId: attendanceId,
    detail: `${current.status} → ${status}`,
  });

  revalidatePath("/admin/attendance/history");
  return { status: "success", message: "Attendance updated." };
}
