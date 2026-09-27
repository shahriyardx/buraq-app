import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import {
  LOGO_CID,
  renderEmail,
  type SchoolInfo,
  type Vars,
} from "@/lib/mail/layout";
import { EMAIL_TEMPLATES, type EmailTemplateKey } from "@/lib/mail/templates";
import { prisma } from "@/lib/prisma";
import { appUrl } from "@/lib/qr";

type Attachment = { filename: string; content: Buffer };
type Result = { sent: boolean; reason?: string };

const DEFAULT_SCHOOL = "Buraq Horse Riding School";

let logoCache: Buffer | null = null;
async function logoAttachment() {
  if (!logoCache) {
    try {
      logoCache = await readFile(
        path.join(process.cwd(), "public", "email-logo.png"),
      );
    } catch {
      return [];
    }
  }
  return [{ filename: "logo.png", content: logoCache, contentId: LOGO_CID }];
}

async function schoolInfo(): Promise<SchoolInfo> {
  const s = await prisma.schoolSettings.findUnique({
    where: { id: "singleton" },
    select: { name: true, address: true, phone: true, email: true },
  });
  return {
    name: s?.name ?? DEFAULT_SCHOOL,
    address: s?.address,
    phone: s?.phone,
    email: s?.email,
    appUrl: appUrl("/"),
  };
}

/** Code default, overridden by an admin-edited subject/body if one exists. */
async function templateText(key: EmailTemplateKey) {
  const def = EMAIL_TEMPLATES[key];
  const row = await prisma.emailTemplate.findUnique({ where: { key } });
  return {
    def,
    subject: row?.subject?.trim() || def.subject,
    body: row?.body?.trim() || def.body,
  };
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

/**
 * Renders and sends one templated email. Never throws: email is best-effort
 * and must not break the action that triggered it.
 */
export async function sendTemplateEmail(input: {
  key: EmailTemplateKey;
  to: { email: string; name: string };
  vars?: Vars;
  attachments?: Attachment[];
  /** Skip the template's opt-out rule (e.g. admin "send test"). */
  force?: boolean;
  optedOut?: boolean;
}): Promise<Result> {
  try {
    if (!isEmailConfigured())
      return { sent: false, reason: "email-unconfigured" };
    const { def, subject, body } = await templateText(input.key);
    if (!input.force && !def.alwaysSend && input.optedOut) {
      return { sent: false, reason: "opted-out" };
    }

    const school = await schoolInfo();
    const vars: Vars = {
      name: input.to.name,
      firstName: firstName(input.to.name),
      schoolName: school.name,
      loginUrl: appUrl("/login"),
      dashboardUrl: appUrl("/"),
      ...input.vars,
    };
    const email = renderEmail({ def, subject, body, vars, school });

    const res = await sendEmail({
      to: input.to.email,
      subject: email.subject,
      text: email.text,
      html: email.html,
      replyTo: school.email,
      attachments: [...(await logoAttachment()), ...(input.attachments ?? [])],
    });
    return { sent: res.sent, reason: res.error };
  } catch (err) {
    console.error(`[notify] ${input.key} failed`, err);
    return { sent: false, reason: (err as Error).message };
  }
}

/** Sends a templated email to one user (student, instructor or admin). */
export async function notifyUser(input: {
  userId: string;
  key: EmailTemplateKey;
  vars?: Vars;
  attachments?: Attachment[];
}): Promise<Result> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { email: true, name: true, emailNotifications: true },
    });
    if (!user) return { sent: false, reason: "no-user" };
    return sendTemplateEmail({
      key: input.key,
      to: { email: user.email, name: user.name },
      vars: input.vars,
      attachments: input.attachments,
      optedOut: !user.emailNotifications,
    });
  } catch (err) {
    console.error(`[notify] ${input.key} failed`, err);
    return { sent: false, reason: (err as Error).message };
  }
}

/** Kept for existing callers: a student notification by template key. */
export function notifyStudent(input: {
  studentId: string;
  templateKey: EmailTemplateKey;
  vars?: Vars;
  attachments?: Attachment[];
}) {
  return notifyUser({
    userId: input.studentId,
    key: input.templateKey,
    vars: input.vars,
    attachments: input.attachments,
  });
}

/**
 * Sends an admin alert to every active admin who has alerts turned on. With
 * `preferAdminId`, only that admin is alerted (if active, with alerts on);
 * otherwise it falls back to all admins.
 */
export async function notifyAdmins(input: {
  key: EmailTemplateKey;
  vars?: Vars;
  preferAdminId?: string | null;
}): Promise<void> {
  try {
    const where = {
      role: "ADMIN" as const,
      status: "ACTIVE" as const,
      emailNotifications: true,
    };
    const preferred = input.preferAdminId
      ? await prisma.user.findFirst({
          where: { ...where, id: input.preferAdminId },
          select: { email: true, name: true },
        })
      : null;
    const admins = preferred
      ? [preferred]
      : await prisma.user.findMany({
          where,
          select: { email: true, name: true },
        });
    await Promise.all(
      admins.map((a) =>
        sendTemplateEmail({ key: input.key, to: a, vars: input.vars }),
      ),
    );
  } catch (err) {
    console.error(`[notify] ${input.key} admin alert failed`, err);
  }
}

const ROLE_LABEL = {
  ADMIN: "administrator",
  INSTRUCTOR: "instructor",
  STUDENT: "student",
};

/** "Account created" email for accounts an admin creates. */
export function notifyAccountCreated(user: {
  id: string;
  role: "ADMIN" | "INSTRUCTOR" | "STUDENT";
  studentId?: string | null;
  instructorId?: string | null;
  email: string;
}) {
  return notifyUser({
    userId: user.id,
    key: "ACCOUNT_CREATED",
    vars: {
      email: user.email,
      roleLabel: ROLE_LABEL[user.role],
      memberId: user.studentId ?? user.instructorId,
      setPasswordUrl: appUrl("/forgot-password"),
    },
  });
}
