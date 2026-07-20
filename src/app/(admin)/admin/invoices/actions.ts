"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAction } from "@/lib/audit";
import { requireAdmin } from "@/lib/dal";
import { isEmailConfigured, renderTemplate, sendEmail } from "@/lib/email";
import { type ActionState, num, optStr, str } from "@/lib/form";
import { formatCurrency, formatDate } from "@/lib/format";
import { generateInvoiceNumber } from "@/lib/ids";
import { type InvoiceData, renderInvoicePdf } from "@/lib/pdf/invoice";
import { prisma } from "@/lib/prisma";
import { isR2Configured, uploadBufferToR2 } from "@/lib/r2";

const createSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
  courseId: z.string().nullable(),
  amount: z.number().positive("Amount must be greater than 0"),
  discount: z.number().min(0, "Discount cannot be negative"),
  dueDate: z.date({ message: "Due date is required" }),
});

export async function createInvoiceAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();

  const dueRaw = str(fd, "dueDate");
  const due = dueRaw ? new Date(dueRaw) : null;

  const parsed = createSchema.safeParse({
    studentId: str(fd, "studentId"),
    courseId: optStr(fd, "courseId"),
    amount: num(fd, "amount"),
    discount: num(fd, "discount", 0),
    dueDate: due && !Number.isNaN(due.getTime()) ? due : undefined,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  if (parsed.data.discount > parsed.data.amount) {
    return { status: "error", message: "Discount cannot exceed the amount." };
  }

  try {
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: generateInvoiceNumber(),
        studentId: parsed.data.studentId,
        courseId: parsed.data.courseId,
        amount: parsed.data.amount,
        discount: parsed.data.discount,
        dueDate: parsed.data.dueDate,
        status: "UNPAID",
      },
    });

    await logAction({
      actorId: session.user.id,
      actorName: session.user.name,
      action: "invoice.create",
      entity: "Invoice",
      entityId: invoice.id,
      detail: invoice.invoiceNumber,
    });

    revalidatePath("/admin/invoices");
    return {
      status: "success",
      message: `Invoice ${invoice.invoiceNumber} created.`,
    };
  } catch (err) {
    return { status: "error", message: (err as Error).message };
  }
}

const markPaidSchema = z.object({
  paidDate: z.date({ message: "Payment date is required" }),
  paymentMethod: z.enum(["CASH", "BANK", "ONLINE"]),
  reference: z.string().nullable(),
});

export async function markPaidAction(
  invoiceId: string,
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();

  const paidRaw = str(fd, "paidDate");
  const paid = paidRaw ? new Date(paidRaw) : null;

  const parsed = markPaidSchema.safeParse({
    paidDate: paid && !Number.isNaN(paid.getTime()) ? paid : undefined,
    paymentMethod: str(fd, "paymentMethod"),
    reference: optStr(fd, "reference"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  try {
    const invoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        paidDate: parsed.data.paidDate,
        paymentMethod: parsed.data.paymentMethod,
        reference: parsed.data.reference,
        status: "PAID",
      },
    });

    await logAction({
      actorId: session.user.id,
      actorName: session.user.name,
      action: "invoice.mark_paid",
      entity: "Invoice",
      entityId: invoice.id,
      detail: invoice.invoiceNumber,
    });

    revalidatePath("/admin/invoices");
    return {
      status: "success",
      message: `Invoice ${invoice.invoiceNumber} marked paid.`,
    };
  } catch (err) {
    return { status: "error", message: (err as Error).message };
  }
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

type SendResult = { ok: boolean; message: string };

/**
 * Renders the invoice PDF and emails it to the student. Called via
 * useTransition (plain server action, not a form action).
 */
export async function sendInvoiceEmailAction(
  invoiceId: string,
): Promise<SendResult> {
  const session = await requireAdmin();

  if (!isEmailConfigured()) {
    return {
      ok: false,
      message: "Email is not configured. Set RESEND_API_KEY to send invoices.",
    };
  }

  const built = await buildInvoiceData(invoiceId);
  if (!built) return { ok: false, message: "Invoice not found." };

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
    actorId: session.user.id,
    actorName: session.user.name,
    action: "invoice.email",
    entity: "Invoice",
    entityId: invoiceId,
    detail: `${built.invoiceNumber} → ${built.studentEmail}${result.sent ? "" : " (failed)"}`,
  });

  if (!result.sent) {
    return {
      ok: false,
      message: result.error ?? "Failed to send invoice email.",
    };
  }
  return { ok: true, message: `Invoice emailed to ${built.studentEmail}.` };
}

/**
 * Renders the invoice PDF, stores it in R2, and persists the pdfUrl. Called via
 * useTransition. No-op with a friendly message when R2 is not configured.
 */
export async function generateInvoicePdfAction(
  invoiceId: string,
): Promise<SendResult> {
  const session = await requireAdmin();

  if (!isR2Configured()) {
    return {
      ok: false,
      message:
        "File storage is not configured. Set R2_* variables to store PDFs.",
    };
  }

  const built = await buildInvoiceData(invoiceId);
  if (!built) return { ok: false, message: "Invoice not found." };

  try {
    const pdfBuffer = await renderInvoicePdf(built.data);
    const url = await uploadBufferToR2(
      pdfBuffer,
      "invoices",
      `${built.invoiceNumber}.pdf`,
      "application/pdf",
    );
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { pdfUrl: url },
    });

    await logAction({
      actorId: session.user.id,
      actorName: session.user.name,
      action: "invoice.pdf",
      entity: "Invoice",
      entityId: invoiceId,
      detail: built.invoiceNumber,
    });

    revalidatePath("/admin/invoices");
    return { ok: true, message: "Invoice PDF generated." };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

/** Flags any past-due UNPAID invoices as OVERDUE. Safe to call on page load. */
export async function markOverdue() {
  await prisma.invoice.updateMany({
    where: { status: "UNPAID", dueDate: { lt: new Date() } },
    data: { status: "OVERDUE" },
  });
}
