import "server-only";
import {
  DEFAULT_CURRENCY,
  formatCurrency,
  formatCurrencyCode,
  formatDate,
} from "@/lib/format";
import { notifyUser } from "@/lib/notify";
import { schoolLogoDataUrl } from "@/lib/pdf/assets";
import { type InvoiceData, renderInvoicePdf } from "@/lib/pdf/invoice";
import { prisma } from "@/lib/prisma";
import { appUrl } from "@/lib/qr";

const METHOD_LABEL: Record<string, string> = {
  ONLINE: "Online payment",
  BANK: "Bank transfer",
  CASH: "Cash at the office",
};

export function paymentMethodLabel(method: string | null | undefined) {
  return method ? (METHOD_LABEL[method] ?? method) : "";
}

/** Builds the InvoiceData payload used by the PDF renderer. */
export async function buildInvoiceData(invoiceId: string): Promise<{
  data: InvoiceData;
  studentEmail: string;
  studentName: string;
  invoiceNumber: string;
  dueDate: Date;
  net: number;
  currency: string;
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
  const currency = settings?.currency ?? DEFAULT_CURRENCY;

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
    amount: formatCurrencyCode(amount, currency),
    discount: formatCurrencyCode(discount, currency),
    total: formatCurrencyCode(net, currency),
    dueDate: formatDate(invoice.dueDate),
    issuedDate: formatDate(invoice.createdAt),
    paidDate: invoice.paidDate ? formatDate(invoice.paidDate) : null,
    paymentMethod: invoice.paymentMethod,
    reference: invoice.reference,
    logoSrc: await schoolLogoDataUrl(settings?.logoUrl),
  };

  return {
    data,
    studentEmail: invoice.student.email,
    studentName: invoice.student.name,
    invoiceNumber: invoice.invoiceNumber,
    dueDate: invoice.dueDate,
    net,
    currency,
  };
}

/**
 * Emails an invoice with its PDF attached: INVOICE for a new/open invoice,
 * PAYMENT_CONFIRMED (receipt) once paid. Best-effort, never throws.
 */
export async function emailInvoice(
  invoiceId: string,
  key: "INVOICE" | "PAYMENT_CONFIRMED" = "INVOICE",
  extraVars: Record<string, string | null | undefined> = {},
) {
  try {
    const built = await buildInvoiceData(invoiceId);
    if (!built) return { sent: false, reason: "no-invoice" };
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        studentId: true,
        paidDate: true,
        paymentMethod: true,
        course: { select: { name: true } },
      },
    });
    if (!invoice) return { sent: false, reason: "no-invoice" };

    const pdf = await renderInvoicePdf(built.data);
    return await notifyUser({
      userId: invoice.studentId,
      key,
      vars: {
        invoiceNumber: built.invoiceNumber,
        description: invoice.course
          ? `Course enrollment: ${invoice.course.name}`
          : "School fees",
        amount: formatCurrency(built.net, built.currency),
        dueDate: formatDate(built.dueDate),
        paidDate: invoice.paidDate ? formatDate(invoice.paidDate) : null,
        method: paymentMethodLabel(invoice.paymentMethod),
        invoiceUrl: appUrl(`/student/invoices/${invoiceId}`),
        ...extraVars,
      },
      attachments: [{ filename: `${built.invoiceNumber}.pdf`, content: pdf }],
    });
  } catch (err) {
    console.error("[invoice] email failed", err);
    return { sent: false, reason: (err as Error).message };
  }
}
