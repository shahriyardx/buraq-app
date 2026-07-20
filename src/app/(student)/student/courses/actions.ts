"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStudent } from "@/lib/dal";
import { type ActionState, str } from "@/lib/form";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  courseId: z.string().min(1, "Course is required"),
});

/**
 * Student self-service enrollment request. Creates a PENDING enrollment that an
 * admin approves later (approval is what activates the enrollment and generates
 * the invoice — see `enrollStudent`). We never trust a studentId from the form.
 */
export async function requestEnrollmentAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const session = await requireStudent();
  const studentId = session.user.id;

  const parsed = schema.safeParse({ courseId: str(fd, "courseId") });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const { courseId } = parsed.data;

  try {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.status !== "ACTIVE") {
      return {
        status: "error",
        message: "This course is not open for enrollment.",
      };
    }

    const existing = await prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId, courseId } },
    });
    if (existing && existing.status !== "CANCELLED") {
      return {
        status: "error",
        message:
          existing.status === "PENDING"
            ? "You have already requested this course."
            : "You are already enrolled in this course.",
      };
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

    revalidatePath("/student/courses");
    return {
      status: "success",
      message: `Enrollment requested for ${course.name}. Awaiting admin approval.`,
    };
  } catch (err) {
    return { status: "error", message: (err as Error).message };
  }
}
