import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { logAction } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { createUserWithPassword } from "@/lib/users";
import { adminProcedure, createTRPCRouter } from "../init";

const SINGLETON = "singleton";

const TEMPLATE_ORDER = [
  "ENROLLMENT",
  "INVOICE",
  "CERTIFICATE",
  "SUPPORT",
] as const;

const emailKeyEnum = z.enum(TEMPLATE_ORDER);

export const settingsRouter = createTRPCRouter({
  get: adminProcedure.query(async ({ ctx }) => {
    const [settings, certTemplate, emailTemplates, admins, auditLogs] =
      await Promise.all([
        prisma.schoolSettings.findUnique({ where: { id: SINGLETON } }),
        prisma.certificateTemplate.findUnique({ where: { id: SINGLETON } }),
        prisma.emailTemplate.findMany(),
        prisma.user.findMany({
          where: { role: "ADMIN" },
          orderBy: [{ isSuperAdmin: "desc" }, { createdAt: "desc" }],
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            isSuperAdmin: true,
            createdAt: true,
          },
        }),
        prisma.auditLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 200,
        }),
      ]);

    const profile = {
      name: settings?.name ?? "Buraq Horse Riding School",
      logoUrl: settings?.logoUrl ?? null,
      address: settings?.address ?? null,
      phone: settings?.phone ?? null,
      email: settings?.email ?? null,
      officeHours: settings?.officeHours ?? null,
      currency: settings?.currency ?? "BDT",
    };

    const byKey = new Map(emailTemplates.map((t) => [t.key, t]));
    const templates = TEMPLATE_ORDER.map((key) => {
      const t = byKey.get(key);
      return {
        key,
        subject: t?.subject ?? "",
        body: t?.body ?? "",
      };
    });

    const certificate = {
      signatureName: certTemplate?.signatureName ?? null,
      logoUrl: certTemplate?.logoUrl ?? null,
      signatureUrl: certTemplate?.signatureUrl ?? null,
      designUrl: certTemplate?.designUrl ?? null,
    };

    return {
      profile,
      attendanceThreshold: settings?.attendanceThreshold ?? 75,
      templates,
      certificate,
      admins,
      auditLogs,
      currentUserId: ctx.session.user.id,
      isSuperAdmin: Boolean(ctx.session.user.isSuperAdmin),
    };
  }),

  /** The signed-in admin's own account (not the school profile). */
  myProfile: adminProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { name: true, email: true, phone: true, photoUrl: true },
    });
    return {
      name: user?.name ?? "",
      email: user?.email ?? "",
      phone: user?.phone ?? null,
      photoUrl: user?.photoUrl ?? null,
    };
  }),

  updateMyProfile: adminProcedure
    .input(
      z.object({
        name: z.string().trim().min(2, "Name is required"),
        phone: z.string().nullish(),
        photoUrl: z.string().url().nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await prisma.user.update({
        where: { id: ctx.session.user.id },
        data: {
          name: input.name,
          phone: input.phone ?? null,
          ...(input.photoUrl ? { photoUrl: input.photoUrl } : {}),
        },
      });

      await logAction({
        actorId: ctx.session.user.id,
        actorName: input.name,
        action: "account.update_profile",
        entity: "User",
        entityId: ctx.session.user.id,
      });

      return { ok: true };
    }),

  updateProfile: adminProcedure
    .input(
      z.object({
        name: z.string().min(2, "School name is required"),
        address: z.string().nullish(),
        phone: z.string().nullish(),
        email: z.string().email("Valid email required").nullish(),
        officeHours: z.string().nullish(),
        currency: z
          .string()
          .regex(/^[A-Z]{3}$/, "Use a 3-letter ISO currency code")
          .nullish(),
        logoUrl: z.string().url().nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const data = {
        name: input.name,
        address: input.address ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        officeHours: input.officeHours ?? null,
        ...(input.currency ? { currency: input.currency } : {}),
        ...(input.logoUrl ? { logoUrl: input.logoUrl } : {}),
      };

      await prisma.schoolSettings.upsert({
        where: { id: SINGLETON },
        update: data,
        create: { id: SINGLETON, ...data },
      });

      await logAction({
        actorId: ctx.session.user.id,
        actorName: ctx.session.user.name,
        action: "settings.profile_update",
        entity: "SchoolSettings",
        entityId: SINGLETON,
      });
      return { ok: true };
    }),

  updateThreshold: adminProcedure
    .input(
      z.object({
        attendanceThreshold: z
          .number()
          .int("Threshold must be a whole number")
          .min(0, "Threshold must be at least 0")
          .max(100, "Threshold must be at most 100"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await prisma.schoolSettings.upsert({
        where: { id: SINGLETON },
        update: { attendanceThreshold: input.attendanceThreshold },
        create: {
          id: SINGLETON,
          attendanceThreshold: input.attendanceThreshold,
        },
      });

      await logAction({
        actorId: ctx.session.user.id,
        actorName: ctx.session.user.name,
        action: "settings.threshold_update",
        entity: "SchoolSettings",
        entityId: SINGLETON,
        detail: `${input.attendanceThreshold}%`,
      });
      return { ok: true };
    }),

  updateEmailTemplate: adminProcedure
    .input(
      z.object({
        key: emailKeyEnum,
        subject: z.string().min(1, "Subject is required"),
        body: z.string().min(1, "Body is required"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await prisma.emailTemplate.upsert({
        where: { key: input.key },
        update: { subject: input.subject, body: input.body },
        create: { key: input.key, subject: input.subject, body: input.body },
      });

      await logAction({
        actorId: ctx.session.user.id,
        actorName: ctx.session.user.name,
        action: "settings.email_template_update",
        entity: "EmailTemplate",
        detail: input.key,
      });
      return { ok: true };
    }),

  updateCertificateTemplate: adminProcedure
    .input(
      z.object({
        signatureName: z.string().nullish(),
        logoUrl: z.string().url().nullish(),
        signatureUrl: z.string().url().nullish(),
        designUrl: z.string().url().nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const uploads = {
        ...(input.logoUrl ? { logoUrl: input.logoUrl } : {}),
        ...(input.signatureUrl ? { signatureUrl: input.signatureUrl } : {}),
        ...(input.designUrl ? { designUrl: input.designUrl } : {}),
      };
      const signatureName = input.signatureName ?? null;

      await prisma.certificateTemplate.upsert({
        where: { id: SINGLETON },
        update: { signatureName, ...uploads },
        create: { id: SINGLETON, signatureName, ...uploads },
      });

      await logAction({
        actorId: ctx.session.user.id,
        actorName: ctx.session.user.name,
        action: "settings.certificate_template_update",
        entity: "CertificateTemplate",
        entityId: SINGLETON,
      });
      return { ok: true };
    }),

  addAdmin: adminProcedure
    .input(
      z.object({
        name: z.string().min(2, "Name is required"),
        email: z.string().email("Valid email required"),
        password: z.string().min(8, "Password must be at least 8 characters"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.isSuperAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the super-admin can add administrators.",
        });
      }
      const admin = await createUserWithPassword({
        name: input.name,
        email: input.email,
        password: input.password,
        role: "ADMIN",
      });

      await logAction({
        actorId: ctx.session.user.id,
        actorName: ctx.session.user.name,
        action: "settings.admin_add",
        entity: "User",
        entityId: admin.id,
        detail: admin.email,
      });
      return { id: admin.id, name: admin.name };
    }),

  removeAdmin: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.isSuperAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the super-admin can remove administrators.",
        });
      }
      if (input.userId === ctx.session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot remove your own admin account.",
        });
      }
      const target = await prisma.user.findUnique({
        where: { id: input.userId },
        select: { isSuperAdmin: true },
      });
      if (target?.isSuperAdmin) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "The super-admin cannot be removed.",
        });
      }

      await prisma.user.update({
        where: { id: input.userId },
        data: { status: "INACTIVE" },
      });

      await logAction({
        actorId: ctx.session.user.id,
        actorName: ctx.session.user.name,
        action: "settings.admin_remove",
        entity: "User",
        entityId: input.userId,
      });
      return { ok: true };
    }),

  auditLog: adminProcedure.query(async () => {
    return prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }),
});
