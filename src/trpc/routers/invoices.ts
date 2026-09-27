import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { logAction } from "@/lib/audit";
import { isEmailConfigured } from "@/lib/email";
import { DEFAULT_CURRENCY, formatCurrency } from "@/lib/format";
import { generateInvoiceNumber } from "@/lib/ids";
import {
  buildInvoiceData,
  emailInvoice,
  paymentMethodLabel,
} from "@/lib/invoices";
import { notifyAdmins, notifyUser } from "@/lib/notify";
import { renderInvoicePdf } from "@/lib/pdf/invoice";
import { prisma } from "@/lib/prisma";
import { appUrl } from "@/lib/qr";
import { isR2Configured, uploadBufferToR2 } from "@/lib/r2";
import { adminProcedure, createTRPCRouter, studentProcedure } from "../init";

async function currencyCode() {
  const s = await prisma.schoolSettings.findUnique({
    where: { id: "singleton" },
    select: { currency: true },
  });
  return s?.currency ?? DEFAULT_CURRENCY;
}

/** Flags any past-due UNPAID invoices as OVERDUE. Safe to call on page load. */
async function markOverdue(studentId?: string) {
  await prisma.invoice.updateMany({
    where: {
      status: "UNPAID",
      dueDate: { lt: new Date() },
      ...(studentId ? { studentId } : {}),
    },
    data: { status: "OVERDUE" },
  });
}

/**
 * Activates the enrollment tied to a paid invoice — the student's booking
 * window (weeks) starts from payment approval. Only promotes PENDING/CANCELLED
 * enrollments; never touches already-active or completed ones.
 */
async function activatePaidEnrollment(
  studentId: string,
  courseId: string | null,
): Promise<string | null> {
  if (!courseId) return null;
  const enrollment = await prisma.enrollment.findUnique({
    where: { studentId_courseId: { studentId, courseId } },
    include: { course: { select: { name: true } } },
  });
  if (!enrollment) return null;
  if (enrollment.status === "PENDING" || enrollment.status === "CANCELLED") {
    const now = new Date();
    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { status: "ACTIVE", startDate: now, approvedAt: now },
    });
    return enrollment.course.name;
  }
  return null;
}

function enrollmentNote(courseName: string | null) {
  return courseName
    ? `Your enrollment in ${courseName} is now active, and you can start booking your riding sessions.`
    : null;
}

export const invoicesRouter = createTRPCRouter({
  list: adminProcedure.query(async () => {
    // Flag past-due invoices before reading so KPIs and rows reflect reality.
    await markOverdue();

    const invoices = await prisma.invoice.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        student: { select: { name: true } },
        course: { select: { name: true } },
      },
    });

    const rows = invoices.map((i) => {
      const amount = Number(i.amount);
      const discount = Number(i.discount);
      return {
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        studentName: i.student.name,
        courseName: i.course?.name ?? null,
        amount: amount.toFixed(2),
        discount: discount.toFixed(2),
        net: (amount - discount).toFixed(2),
        dueDate: i.dueDate.toISOString(),
        status: i.status,
        paymentMethod: i.paymentMethod,
        transactionId: i.transactionId,
        pdfUrl: i.pdfUrl,
      };
    });

    const outstanding = invoices
      .filter((i) => i.status === "UNPAID" || i.status === "OVERDUE")
      .reduce((sum, i) => sum + (Number(i.amount) - Number(i.discount)), 0);

    return {
      rows,
      outstanding: outstanding.toFixed(2),
      unpaidCount: invoices.filter((i) => i.status === "UNPAID").length,
      overdueCount: invoices.filter((i) => i.status === "OVERDUE").length,
      paidCount: invoices.filter((i) => i.status === "PAID").length,
    };
  }),

  studentOptions: adminProcedure.query(async () => {
    return prisma.user.findMany({
      where: { role: "STUDENT" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
  }),

  courseOptions: adminProcedure.query(async () => {
    const courses = await prisma.course.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, price: true },
    });
    return courses.map((c) => ({
      id: c.id,
      name: c.name,
      price: Number(c.price).toFixed(2),
    }));
  }),

  create: adminProcedure
    .input(
      z.object({
        studentId: z.string().min(1, "Student is required"),
        courseId: z.string().nullish(),
        amount: z.coerce.number().positive("Amount must be greater than 0"),
        discount: z.coerce.number().min(0, "Discount cannot be negative"),
        dueDate: z.coerce.date({ message: "Due date is required" }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.discount > input.amount) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Discount cannot exceed the amount.",
        });
      }

      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber: generateInvoiceNumber(),
          studentId: input.studentId,
          courseId: input.courseId ?? null,
          amount: input.amount,
          discount: input.discount,
          dueDate: input.dueDate,
          status: "UNPAID",
        },
      });

      await logAction({
        actorId: ctx.session.user.id,
        actorName: ctx.session.user.name,
        action: "invoice.create",
        entity: "Invoice",
        entityId: invoice.id,
        detail: invoice.invoiceNumber,
      });

      await emailInvoice(invoice.id, "INVOICE");

      return { invoiceNumber: invoice.invoiceNumber };
    }),

  markPaid: adminProcedure
    .input(
      z.object({
        id: z.string().min(1),
        paidDate: z.coerce.date({ message: "Payment date is required" }),
        paymentMethod: z.enum(["CASH", "BANK", "ONLINE"]),
        reference: z.string().nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const invoice = await prisma.invoice.update({
        where: { id: input.id },
        data: {
          paidDate: input.paidDate,
          paymentMethod: input.paymentMethod,
          reference: input.reference ?? null,
          status: "PAID",
        },
      });
      const activated = await activatePaidEnrollment(
        invoice.studentId,
        invoice.courseId,
      );
      await emailInvoice(invoice.id, "PAYMENT_CONFIRMED", {
        enrollmentNote: enrollmentNote(activated),
      });

      await logAction({
        actorId: ctx.session.user.id,
        actorName: ctx.session.user.name,
        action: "invoice.mark_paid",
        entity: "Invoice",
        entityId: invoice.id,
        detail: invoice.invoiceNumber,
      });

      return { invoiceNumber: invoice.invoiceNumber };
    }),

  /** Admin approves a submitted payment → PAID and the enrollment activates. */
  approvePayment: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.invoice.findUnique({
        where: { id: input.id },
        select: { status: true },
      });
      if (!existing || existing.status !== "PROCESSING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only invoices awaiting review can be approved.",
        });
      }
      const invoice = await prisma.invoice.update({
        where: { id: input.id },
        // Keep whatever method the student chose (ONLINE / CASH).
        data: { status: "PAID", paidDate: new Date() },
      });
      const activated = await activatePaidEnrollment(
        invoice.studentId,
        invoice.courseId,
      );
      await emailInvoice(invoice.id, "PAYMENT_CONFIRMED", {
        enrollmentNote: enrollmentNote(activated),
      });

      await logAction({
        actorId: ctx.session.user.id,
        actorName: ctx.session.user.name,
        action: "invoice.approve_payment",
        entity: "Invoice",
        entityId: invoice.id,
        detail: invoice.invoiceNumber,
      });
      return { invoiceNumber: invoice.invoiceNumber };
    }),

  /** Admin rejects a submitted payment → back to UNPAID; student pays again. */
  rejectPayment: adminProcedure
    .input(z.object({ id: z.string().min(1), reason: z.string().nullish() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.invoice.findUnique({
        where: { id: input.id },
        select: { status: true },
      });
      if (!existing || existing.status !== "PROCESSING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only invoices awaiting review can be rejected.",
        });
      }
      const invoice = await prisma.invoice.update({
        where: { id: input.id },
        data: { status: "UNPAID", transactionId: null },
      });
      await notifyUser({
        userId: invoice.studentId,
        key: "PAYMENT_REJECTED",
        vars: {
          invoiceNumber: invoice.invoiceNumber,
          amount: formatCurrency(
            Number(invoice.amount) - Number(invoice.discount),
            await currencyCode(),
          ),
          reason:
            input.reason?.trim() ||
            "We could not match the payment to our records.",
          invoiceUrl: appUrl(`/student/invoices/${invoice.id}`),
        },
      });
      await logAction({
        actorId: ctx.session.user.id,
        actorName: ctx.session.user.name,
        action: "invoice.reject_payment",
        entity: "Invoice",
        entityId: invoice.id,
        detail: input.reason ?? invoice.invoiceNumber,
      });
      return { invoiceNumber: invoice.invoiceNumber };
    }),

  sendEmail: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (!isEmailConfigured()) {
        return {
          ok: false,
          message:
            "Email is not configured. Set RESEND_API_KEY to send invoices.",
        };
      }

      const invoice = await prisma.invoice.findUnique({
        where: { id: input.id },
        select: {
          invoiceNumber: true,
          status: true,
          student: { select: { email: true } },
        },
      });
      if (!invoice) throw new TRPCError({ code: "NOT_FOUND" });

      // A paid invoice goes out as a receipt; anything else as the invoice.
      const result = await emailInvoice(
        input.id,
        invoice.status === "PAID" ? "PAYMENT_CONFIRMED" : "INVOICE",
      );

      await logAction({
        actorId: ctx.session.user.id,
        actorName: ctx.session.user.name,
        action: "invoice.email",
        entity: "Invoice",
        entityId: input.id,
        detail: `${invoice.invoiceNumber} → ${invoice.student.email}${result.sent ? "" : " (failed)"}`,
      });

      if (!result.sent) {
        return {
          ok: false,
          message: result.reason ?? "Failed to send invoice email.",
        };
      }
      return {
        ok: true,
        message: `Invoice emailed to ${invoice.student.email}.`,
      };
    }),

  generatePdf: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (!isR2Configured()) {
        return {
          ok: false,
          message:
            "File storage is not configured. Set R2_* variables to store PDFs.",
        };
      }

      const built = await buildInvoiceData(input.id);
      if (!built) throw new TRPCError({ code: "NOT_FOUND" });

      const pdfBuffer = await renderInvoicePdf(built.data);
      const url = await uploadBufferToR2(
        pdfBuffer,
        "invoices",
        `${built.invoiceNumber}.pdf`,
        "application/pdf",
      );
      await prisma.invoice.update({
        where: { id: input.id },
        data: { pdfUrl: url },
      });

      await logAction({
        actorId: ctx.session.user.id,
        actorName: ctx.session.user.name,
        action: "invoice.pdf",
        entity: "Invoice",
        entityId: input.id,
        detail: built.invoiceNumber,
      });

      return { ok: true, message: "Invoice PDF generated." };
    }),

  mine: studentProcedure.query(async ({ ctx }) => {
    const studentId = ctx.session.user.id;

    // Flag past-due invoices before reading so the banner and rows reflect reality.
    await markOverdue(studentId);

    const invoices = await prisma.invoice.findMany({
      where: { studentId },
      orderBy: { createdAt: "desc" },
      include: { course: { select: { name: true } } },
    });

    const rows = invoices.map((i) => ({
      id: i.id,
      invoiceNumber: i.invoiceNumber,
      courseName: i.course?.name ?? null,
      net: (Number(i.amount) - Number(i.discount)).toFixed(2),
      dueDate: i.dueDate.toISOString(),
      status: i.status,
      pdfUrl: i.pdfUrl,
    }));

    const outstandingInvoices = invoices.filter(
      (i) => i.status === "UNPAID" || i.status === "OVERDUE",
    );
    const outstandingTotal = outstandingInvoices.reduce(
      (sum, i) => sum + (Number(i.amount) - Number(i.discount)),
      0,
    );

    return {
      rows,
      outstandingCount: outstandingInvoices.length,
      outstandingTotal: outstandingTotal.toFixed(2),
    };
  }),

  /** A single invoice owned by the student (payment page). */
  get: studentProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [invoice, settings] = await Promise.all([
        prisma.invoice.findFirst({
          where: { id: input.id, studentId: ctx.session.user.id },
          include: { course: { select: { name: true } } },
        }),
        prisma.schoolSettings.findUnique({
          where: { id: "singleton" },
          select: { currency: true, name: true, email: true, phone: true },
        }),
      ]);
      if (!invoice) throw new TRPCError({ code: "NOT_FOUND" });
      return {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        courseName: invoice.course?.name ?? null,
        amount: invoice.amount.toString(),
        discount: invoice.discount.toString(),
        net: (Number(invoice.amount) - Number(invoice.discount)).toFixed(2),
        dueDate: invoice.dueDate,
        status: invoice.status,
        transactionId: invoice.transactionId,
        paymentMethod: invoice.paymentMethod,
        pdfUrl: invoice.pdfUrl,
        currency: settings?.currency ?? DEFAULT_CURRENCY,
        schoolName: settings?.name ?? "Buraq Horse Riding School",
        schoolEmail: settings?.email ?? null,
        schoolPhone: settings?.phone ?? null,
      };
    }),

  /**
   * Student submits payment → invoice moves to PROCESSING for admin review.
   * ONLINE requires a transaction id; CASH just flags it (admin calls to
   * verify, then marks paid).
   */
  submitPayment: studentProcedure
    .input(
      z
        .object({
          id: z.string(),
          method: z.enum(["ONLINE", "CASH"]).default("ONLINE"),
          transactionId: z.string().optional(),
        })
        .refine(
          (v) =>
            v.method === "CASH" || (v.transactionId?.trim().length ?? 0) >= 3,
          {
            message: "Enter a valid transaction id",
            path: ["transactionId"],
          },
        ),
    )
    .mutation(async ({ ctx, input }) => {
      const invoice = await prisma.invoice.findFirst({
        where: { id: input.id, studentId: ctx.session.user.id },
        select: {
          id: true,
          status: true,
          invoiceNumber: true,
          amount: true,
          discount: true,
        },
      });
      if (!invoice) throw new TRPCError({ code: "NOT_FOUND" });
      if (invoice.status !== "UNPAID" && invoice.status !== "OVERDUE") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            invoice.status === "PROCESSING"
              ? "Your payment is already under review."
              : "This invoice is already paid.",
        });
      }
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          transactionId:
            input.method === "CASH" ? null : (input.transactionId ?? null),
          paymentMethod: input.method,
          status: "PROCESSING",
        },
      });

      const vars = {
        invoiceNumber: invoice.invoiceNumber,
        amount: formatCurrency(
          Number(invoice.amount) - Number(invoice.discount),
          await currencyCode(),
        ),
        method: paymentMethodLabel(input.method),
        transactionId: input.method === "CASH" ? null : input.transactionId,
      };
      await notifyUser({
        userId: ctx.session.user.id,
        key: "PAYMENT_RECEIVED",
        vars: {
          ...vars,
          invoiceUrl: appUrl(`/student/invoices/${invoice.id}`),
        },
      });
      await notifyAdmins({
        key: "ADMIN_PAYMENT_SUBMITTED",
        vars: {
          ...vars,
          studentName: ctx.session.user.name,
          reviewUrl: appUrl("/admin/invoices"),
        },
      });
      return { ok: true };
    }),
});
