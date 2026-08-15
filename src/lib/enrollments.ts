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
  /** Create the invoice already PAID (admin-covered) instead of UNPAID. */
  invoicePaid?: boolean;
}) {
  const {
    studentId,
    courseId,
    status = "ACTIVE",
    autoInvoice = true,
    invoicePaid = false,
  } = input;

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw new Error("Course not found.");

  const now = new Date();
  const existing = await prisma.enrollment.findUnique({
    where: { studentId_courseId: { studentId, courseId } },
  });

  const enrollment = existing
    ? await prisma.enrollment.update({
        where: { id: existing.id },
        data: {
          status,
          ...(status === "ACTIVE" && !existing.approvedAt
            ? { startDate: now, approvedAt: now }
            : {}),
        },
      })
    : await prisma.enrollment.create({
        data: {
          studentId,
          courseId,
          status,
          startDate: now,
          approvedAt: status === "ACTIVE" ? now : null,
        },
      });

  // Bill the course price when there is no open invoice yet.
  if (autoInvoice && Number(course.price) > 0) {
    const openInvoice = await prisma.invoice.findFirst({
      where: {
        studentId,
        courseId,
        status: { in: ["UNPAID", "OVERDUE", "PROCESSING"] },
      },
    });
    if (!openInvoice) {
      const due = new Date(now);
      due.setDate(due.getDate() + 14);
      await prisma.invoice.create({
        data: {
          invoiceNumber: generateInvoiceNumber(),
          studentId,
          courseId,
          amount: course.price,
          dueDate: due,
          status: invoicePaid ? "PAID" : "UNPAID",
          ...(invoicePaid ? { paidDate: now, paymentMethod: "CASH" } : {}),
        },
      });
    }
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
