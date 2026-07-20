import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { logAction } from "@/lib/audit";
import { isEmailConfigured, renderTemplate, sendEmail } from "@/lib/email";
import { formatCurrency, formatDate } from "@/lib/format";
import { generateInvoiceNumber } from "@/lib/ids";
import { type InvoiceData, renderInvoicePdf } from "@/lib/pdf/invoice";
import { prisma } from "@/lib/prisma";
import { isR2Configured, uploadBufferToR2 } from "@/lib/r2";
import { adminProcedure, createTRPCRouter, studentProcedure } from "../init";

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

/** Builds the InvoiceData payload used by the PDF renderer. */
async function buildInvoiceData(invoiceId: string): Promise<{
  data: InvoiceData;
  studentEmail: string;
  studentName: string;
  invoiceNumber: string;
  dueDate: Date;
  net: number;
} | null> {
  const [invoice, settings] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { student: true, course: true },
    }),
    prisma.schoolSettings.findUnique({ where: { id: "singleton" } }),
  ]);
  if (!invoice) return null;

  const amount = Number(invoice.amount);
  const discount = Number(invoice.discount);
  const net = amount - discount;

  const data: InvoiceData = {
    schoolName: settings?.name ?? "Buraq Horse Riding School",
    schoolAddress: settings?.address ?? null,
    schoolEmail: settings?.email ?? null,
    schoolPhone: settings?.phone ?? null,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    studentName: invoice.student.name,
    studentEmail: invoice.student.email,
    courseName: invoice.course?.name ?? null,
    amount: formatCurrency(amount),
    discount: formatCurrency(discount),
    total: formatCurrency(net),
    dueDate: formatDate(invoice.dueDate),
    issuedDate: formatDate(invoice.createdAt),
    paidDate: invoice.paidDate ? formatDate(invoice.paidDate) : null,
    paymentMethod: invoice.paymentMethod,
    reference: invoice.reference,
  };

  return {
    data,
    studentEmail: invoice.student.email,
    studentName: invoice.student.name,
    invoiceNumber: invoice.invoiceNumber,
    dueDate: invoice.dueDate,
    net,
  };
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

      const built = await buildInvoiceData(input.id);
      if (!built) throw new TRPCError({ code: "NOT_FOUND" });

      const template = await prisma.emailTemplate.findUnique({
        where: { key: "INVOICE" },
      });

      const vars = {
        studentName: built.studentName,
        invoiceNumber: built.invoiceNumber,
        amount: formatCurrency(built.net),
        dueDate: formatDate(built.dueDate),
      };

      const subject = template
        ? renderTemplate(template.subject, vars)
        : `Invoice ${built.invoiceNumber}`;
      const text = template
        ? renderTemplate(template.body, vars)
        : `Dear ${built.studentName},\n\nPlease find attached invoice ${built.invoiceNumber} for ${vars.amount}, due ${vars.dueDate}.\n\nThank you.`;

      const pdfBuffer = await renderInvoicePdf(built.data);

      const result = await sendEmail({
        to: built.studentEmail,
        subject,
        text,
        attachments: [
          { filename: `${built.invoiceNumber}.pdf`, content: pdfBuffer },
        ],
      });

      await logAction({
        actorId: ctx.session.user.id,
        actorName: ctx.session.user.name,
        action: "invoice.email",
        entity: "Invoice",
        entityId: input.id,
        detail: `${built.invoiceNumber} → ${built.studentEmail}${result.sent ? "" : " (failed)"}`,
      });

      if (!result.sent) {
        return {
          ok: false,
          message: result.error ?? "Failed to send invoice email.",
        };
      }
      return { ok: true, message: `Invoice emailed to ${built.studentEmail}.` };
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
});
