"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAction } from "@/lib/audit";
import { requireAdmin } from "@/lib/dal";
import { enrollStudent } from "@/lib/enrollments";
import { type ActionState, num, optStr, str } from "@/lib/form";
import { prisma } from "@/lib/prisma";

const baseSchema = z.object({
  name: z.string().min(2, "Name is required"),
  description: z.string().nullable(),
  level: z.string().nullable(),
  durationWeeks: z
    .number()
    .int()
    .min(0, "Duration must be positive")
    .nullable(),
  price: z.number().min(0, "Price must be positive"),
  schedule: z.string().nullable(),
  maxStudents: z
    .number()
    .int()
    .min(0, "Max students must be positive")
    .nullable(),
  instructor: z.string().nullable(),
});

function parseCourse(fd: FormData) {
  const durationRaw = optStr(fd, "durationWeeks");
  const maxRaw = optStr(fd, "maxStudents");
  return baseSchema.safeParse({
    name: str(fd, "name"),
    description: optStr(fd, "description"),
    level: optStr(fd, "level"),
    durationWeeks: durationRaw ? num(fd, "durationWeeks") : null,
    price: num(fd, "price"),
    schedule: optStr(fd, "schedule"),
    maxStudents: maxRaw ? num(fd, "maxStudents") : null,
    instructor: optStr(fd, "instructor"),
  });
}

export async function createCourseAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();

  const parsed = parseCourse(fd);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  try {
    const course = await prisma.course.create({ data: parsed.data });

    await logAction({
      actorId: session.user.id,
      actorName: session.user.name,
      action: "course.create",
      entity: "Course",
      entityId: course.id,
      detail: course.name,
    });

    revalidatePath("/admin/courses");
    return { status: "success", message: `Course ${course.name} created.` };
  } catch (err) {
    return { status: "error", message: (err as Error).message };
  }
}

export async function updateCourseAction(
  courseId: string,
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();

  const parsed = parseCourse(fd);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  try {
    await prisma.course.update({
      where: { id: courseId },
      data: parsed.data,
    });

    await logAction({
      actorId: session.user.id,
      actorName: session.user.name,
      action: "course.update",
      entity: "Course",
      entityId: courseId,
    });

    revalidatePath("/admin/courses");
    revalidatePath(`/admin/courses/${courseId}`);
    return { status: "success", message: "Course updated." };
  } catch (err) {
    return { status: "error", message: (err as Error).message };
  }
}

export async function setCourseStatusAction(
  courseId: string,
  status: "ACTIVE" | "ARCHIVED",
) {
  const session = await requireAdmin();
  await prisma.course.update({ where: { id: courseId }, data: { status } });
  await logAction({
    actorId: session.user.id,
    actorName: session.user.name,
    action: status === "ACTIVE" ? "course.activate" : "course.archive",
    entity: "Course",
    entityId: courseId,
  });
  revalidatePath("/admin/courses");
  revalidatePath(`/admin/courses/${courseId}`);
}

export async function enrollStudentAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();

  const courseId = optStr(fd, "courseId");
  const studentId = optStr(fd, "studentId");
  if (!courseId || !studentId) {
    return { status: "error", message: "Please select a student." };
  }

  try {
    await enrollStudent({ studentId, courseId });

    await logAction({
      actorId: session.user.id,
      actorName: session.user.name,
      action: "course.enroll",
      entity: "Enrollment",
      entityId: courseId,
      detail: studentId,
    });

    revalidatePath("/admin/courses");
    revalidatePath(`/admin/courses/${courseId}`);
    return { status: "success", message: "Student enrolled." };
  } catch (err) {
    return { status: "error", message: (err as Error).message };
  }
}
