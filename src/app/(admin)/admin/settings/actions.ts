"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAction } from "@/lib/audit";
import { requireAdmin } from "@/lib/dal";
import { type ActionState, file, num, optStr, str } from "@/lib/form";
import { prisma } from "@/lib/prisma";
import { isR2Configured, uploadToR2 } from "@/lib/r2";
import { createUserWithPassword } from "@/lib/users";

const SINGLETON = "singleton";

const profileSchema = z.object({
  name: z.string().min(2, "School name is required"),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().email("Valid email required").nullable(),
  officeHours: z.string().nullable(),
});

export async function updateSchoolProfileAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();

  const parsed = profileSchema.safeParse({
    name: str(fd, "name"),
    address: optStr(fd, "address"),
    phone: optStr(fd, "phone"),
    email: optStr(fd, "email"),
    officeHours: optStr(fd, "officeHours"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  try {
    let logoUrl: string | undefined;
    const logo = file(fd, "logo");
    if (logo && isR2Configured()) {
      logoUrl = await uploadToR2(logo, "school");
    }

    await prisma.schoolSettings.upsert({
      where: { id: SINGLETON },
      update: {
        ...parsed.data,
        ...(logoUrl ? { logoUrl } : {}),
      },
      create: {
        id: SINGLETON,
        ...parsed.data,
        ...(logoUrl ? { logoUrl } : {}),
      },
    });

    await logAction({
      actorId: session.user.id,
      actorName: session.user.name,
      action: "settings.profile_update",
      entity: "SchoolSettings",
      entityId: SINGLETON,
    });

    revalidatePath("/admin/settings");
    return { status: "success", message: "School profile saved." };
  } catch (err) {
    return { status: "error", message: (err as Error).message };
  }
}

export async function updateThresholdAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();

  const value = num(fd, "attendanceThreshold");
  const parsed = z
    .number()
    .int("Threshold must be a whole number")
    .min(0, "Threshold must be at least 0")
    .max(100, "Threshold must be at most 100")
    .safeParse(value);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid threshold",
    };
  }

  try {
    await prisma.schoolSettings.upsert({
      where: { id: SINGLETON },
      update: { attendanceThreshold: parsed.data },
      create: { id: SINGLETON, attendanceThreshold: parsed.data },
    });

    await logAction({
      actorId: session.user.id,
      actorName: session.user.name,
      action: "settings.threshold_update",
      entity: "SchoolSettings",
      entityId: SINGLETON,
      detail: `${parsed.data}%`,
    });

    revalidatePath("/admin/settings");
    return { status: "success", message: "Attendance threshold saved." };
  } catch (err) {
    return { status: "error", message: (err as Error).message };
  }
}

const emailKeyEnum = z.enum([
  "ENROLLMENT",
  "INVOICE",
  "CERTIFICATE",
  "SUPPORT",
]);

export async function updateEmailTemplateAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();

  const parsed = z
    .object({
      key: emailKeyEnum,
      subject: z.string().min(1, "Subject is required"),
      body: z.string().min(1, "Body is required"),
    })
    .safeParse({
      key: str(fd, "key"),
      subject: str(fd, "subject"),
      body: str(fd, "body"),
    });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  try {
    await prisma.emailTemplate.upsert({
      where: { key: parsed.data.key },
      update: { subject: parsed.data.subject, body: parsed.data.body },
      create: {
        key: parsed.data.key,
        subject: parsed.data.subject,
        body: parsed.data.body,
      },
    });

    await logAction({
      actorId: session.user.id,
      actorName: session.user.name,
      action: "settings.email_template_update",
      entity: "EmailTemplate",
      detail: parsed.data.key,
    });

    revalidatePath("/admin/settings");
    return {
      status: "success",
      message: `${parsed.data.key} template saved.`,
    };
  } catch (err) {
    return { status: "error", message: (err as Error).message };
  }
}

export async function updateCertificateTemplateAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();

  const signatureName = optStr(fd, "signatureName");

  try {
    const uploads: {
      logoUrl?: string;
      signatureUrl?: string;
      designUrl?: string;
    } = {};
    if (isR2Configured()) {
      const logo = file(fd, "logo");
      const signature = file(fd, "signature");
      const design = file(fd, "design");
      if (logo) uploads.logoUrl = await uploadToR2(logo, "certificates");
      if (signature)
        uploads.signatureUrl = await uploadToR2(signature, "certificates");
      if (design) uploads.designUrl = await uploadToR2(design, "certificates");
    }

    await prisma.certificateTemplate.upsert({
      where: { id: SINGLETON },
      update: { signatureName, ...uploads },
      create: { id: SINGLETON, signatureName, ...uploads },
    });

    await logAction({
      actorId: session.user.id,
      actorName: session.user.name,
      action: "settings.certificate_template_update",
      entity: "CertificateTemplate",
      entityId: SINGLETON,
    });

    revalidatePath("/admin/settings");
    return { status: "success", message: "Certificate template saved." };
  } catch (err) {
    return { status: "error", message: (err as Error).message };
  }
}

export async function addAdminAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();

  const parsed = z
    .object({
      name: z.string().min(2, "Name is required"),
      email: z.string().email("Valid email required"),
      password: z.string().min(8, "Password must be at least 8 characters"),
    })
    .safeParse({
      name: str(fd, "name"),
      email: str(fd, "email"),
      password: str(fd, "password"),
    });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  try {
    const admin = await createUserWithPassword({
      ...parsed.data,
      role: "ADMIN",
    });

    await logAction({
      actorId: session.user.id,
      actorName: session.user.name,
      action: "settings.admin_add",
      entity: "User",
      entityId: admin.id,
      detail: admin.email,
    });

    revalidatePath("/admin/settings");
    return { status: "success", message: `Admin ${admin.name} added.` };
  } catch (err) {
    return { status: "error", message: (err as Error).message };
  }
}

export async function removeAdminAction(userId: string) {
  const session = await requireAdmin();

  if (userId === session.user.id) {
    throw new Error("You cannot remove your own admin account.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { status: "INACTIVE" },
  });

  await logAction({
    actorId: session.user.id,
    actorName: session.user.name,
    action: "settings.admin_remove",
    entity: "User",
    entityId: userId,
  });

  revalidatePath("/admin/settings");
}
