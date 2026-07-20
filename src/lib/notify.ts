import "server-only";
import { isEmailConfigured, renderTemplate, sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

type TemplateKey = "ENROLLMENT" | "INVOICE" | "CERTIFICATE" | "SUPPORT";

/**
 * Sends a templated email to a student, honoring their notification preference.
 * Best-effort — never throws; returns why it did/didn't send.
 */
export async function notifyStudent(input: {
  studentId: string;
  templateKey: TemplateKey;
  vars: Record<string, string | number | null | undefined>;
  attachments?: { filename: string; content: Buffer }[];
}): Promise<{ sent: boolean; reason?: string }> {
  try {
    if (!isEmailConfigured())
      return { sent: false, reason: "email-unconfigured" };

    const student = await prisma.user.findUnique({
      where: { id: input.studentId },
      select: { email: true, name: true, emailNotifications: true },
    });
    if (!student) return { sent: false, reason: "no-student" };
    if (!student.emailNotifications)
      return { sent: false, reason: "opted-out" };

    const tpl = await prisma.emailTemplate.findUnique({
      where: { key: input.templateKey },
    });
    if (!tpl) return { sent: false, reason: "no-template" };

    const vars = { studentName: student.name, ...input.vars };
    const res = await sendEmail({
      to: student.email,
      subject: renderTemplate(tpl.subject, vars),
      text: renderTemplate(tpl.body, vars),
      attachments: input.attachments,
    });
    return { sent: res.sent, reason: res.error };
  } catch (err) {
    console.error("[notify] failed", err);
    return { sent: false, reason: (err as Error).message };
  }
}
