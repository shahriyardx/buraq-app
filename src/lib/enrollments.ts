import "server-only";
import { generateInvoiceNumber } from "@/lib/ids";
import { notifyStudent } from "@/lib/notify";
import { prisma } from "@/lib/prisma";

/**
 * Enrolls a student in a course and (by default) auto-generates an invoice for
 * the course price. Central rule used by both the Students and Courses modules.
 * Idempotent on the (student, course) pair.
 */
export async function enrollStudent(input: {
  studentId: string;
  courseId: string;
  status?: "PENDING" | "ACTIVE";
  autoInvoice?: boolean;
}) {
  const { studentId, courseId, status = "ACTIVE", autoInvoice = true } = input;

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw new Error("Course not found.");

  const existing = await prisma.enrollment.findUnique({
    where: { studentId_courseId: { studentId, courseId } },
  });

  const enrollment = existing
    ? await prisma.enrollment.update({
        where: { id: existing.id },
        data: { status },
      })
    : await prisma.enrollment.create({
        data: {
          studentId,
          courseId,
          status,
          startDate: new Date(),
          approvedAt: status === "ACTIVE" ? new Date() : null,
        },
      });

  // Only invoice fresh, active enrollments with a positive price.
  if (
    autoInvoice &&
    !existing &&
    status === "ACTIVE" &&
    Number(course.price) > 0
  ) {
    const due = new Date();
    due.setDate(due.getDate() + 14);
    await prisma.invoice.create({
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

  // Welcome email on a newly-activated enrollment.
  if (!existing && status === "ACTIVE") {
    await notifyStudent({
      studentId,
      templateKey: "ENROLLMENT",
      vars: { courseName: course.name },
    });
  }

  return enrollment;
}
