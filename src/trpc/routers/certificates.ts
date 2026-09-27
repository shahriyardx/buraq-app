import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { logAction } from "@/lib/audit";
import { formatDate } from "@/lib/format";
import { generateCertificateId } from "@/lib/ids";
import { notifyStudent } from "@/lib/notify";
import { remoteImageDataUrl, schoolLogoDataUrl } from "@/lib/pdf/assets";
import { renderCertificatePdf } from "@/lib/pdf/certificate";
import { prisma } from "@/lib/prisma";
import { appUrl, qrDataUrl } from "@/lib/qr";
import { isR2Configured, uploadBufferToR2 } from "@/lib/r2";
import {
  adminProcedure,
  createTRPCRouter,
  publicProcedure,
  studentProcedure,
} from "../init";

export const certificatesRouter = createTRPCRouter({
  list: adminProcedure.query(async () => {
    const certificates = await prisma.certificate.findMany({
      orderBy: { issuedDate: "desc" },
      include: {
        student: { select: { name: true } },
        course: { select: { name: true } },
      },
    });
    return certificates.map((c) => ({
      id: c.id,
      certificateId: c.certificateId,
      studentName: c.student.name,
      courseName: c.course.name,
      issuedDate: c.issuedDate,
      status: c.status,
      pdfUrl: c.pdfUrl,
      revokedReason: c.revokedReason,
    }));
  }),

  studentOptions: adminProcedure.query(async () => {
    return prisma.user.findMany({
      where: { role: "STUDENT" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, studentId: true },
    });
  }),

  courseOptions: adminProcedure.query(async () => {
    return prisma.course.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
  }),

  generate: adminProcedure
    .input(
      z.object({
        studentId: z.string().min(1, "Select a student"),
        courseId: z.string().min(1, "Select a course"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [student, course] = await Promise.all([
        prisma.user.findUnique({
          where: { id: input.studentId },
          select: { id: true, name: true },
        }),
        prisma.course.findUnique({
          where: { id: input.courseId },
          select: { id: true, name: true, level: true },
        }),
      ]);
      if (!student)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Student not found.",
        });
      if (!course)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course not found.",
        });

      const certificateId = generateCertificateId();
      const issuedDate = new Date();

      const certificate = await prisma.certificate.create({
        data: {
          certificateId,
          studentId: student.id,
          courseId: course.id,
          issuedDate,
          status: "VALID",
        },
      });

      // Build the verification QR + PDF.
      const verifyUrl = appUrl(`/verify/${certificateId}`);
      const qr = await qrDataUrl(verifyUrl);

      const [settings, template] = await Promise.all([
        prisma.schoolSettings.findUnique({ where: { id: "singleton" } }),
        prisma.certificateTemplate.findUnique({ where: { id: "singleton" } }),
      ]);

      // Uploaded template assets win; the logo falls back to the bundled one.
      const [uploadedLogo, signatureSrc, designSrc] = await Promise.all([
        remoteImageDataUrl(template?.logoUrl),
        remoteImageDataUrl(template?.signatureUrl),
        remoteImageDataUrl(template?.designUrl),
      ]);
      const logoSrc =
        uploadedLogo ?? (await schoolLogoDataUrl(settings?.logoUrl));

      const buf = await renderCertificatePdf({
        schoolName: settings?.name ?? "Buraq Horse Riding School",
        studentName: student.name,
        courseName: course.name,
        courseLevel: course.level,
        certificateId,
        issuedDate: formatDate(issuedDate),
        qrDataUrl: qr,
        signatureName: template?.signatureName,
        verifyUrl,
        logoSrc,
        signatureSrc,
        designSrc,
      });

      let pdfUrl: string | null = null;
      if (isR2Configured()) {
        pdfUrl = await uploadBufferToR2(
          buf,
          "certificates",
          `${certificateId}.pdf`,
          "application/pdf",
        );
        await prisma.certificate.update({
          where: { id: certificate.id },
          data: { pdfUrl },
        });
      }

      // Email the student their certificate (PDF attached).
      await notifyStudent({
        studentId: student.id,
        templateKey: "CERTIFICATE",
        vars: {
          courseName: course.name,
          certificateId,
          issuedDate: formatDate(issuedDate),
          verifyUrl,
        },
        attachments: [{ filename: `${certificateId}.pdf`, content: buf }],
      });

      await logAction({
        actorId: ctx.session.user.id,
        actorName: ctx.session.user.name,
        action: "certificate.generate",
        entity: "Certificate",
        entityId: certificate.id,
        detail: certificateId,
      });

      return { certificateId, studentName: student.name };
    }),

  revoke: adminProcedure
    .input(
      z.object({
        certificateId: z.string().min(1),
        reason: z.string().min(1, "A revocation reason is required."),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const certificate = await prisma.certificate.update({
        where: { certificateId: input.certificateId },
        data: {
          status: "REVOKED",
          revokedReason: input.reason,
          revokedAt: new Date(),
        },
      });

      await logAction({
        actorId: ctx.session.user.id,
        actorName: ctx.session.user.name,
        action: "certificate.revoke",
        entity: "Certificate",
        entityId: certificate.id,
        detail: input.reason,
      });

      return { certificateId: input.certificateId };
    }),

  mine: studentProcedure.query(async ({ ctx }) => {
    const certificates = await prisma.certificate.findMany({
      where: { studentId: ctx.session.user.id },
      include: { course: { select: { name: true } } },
      orderBy: { issuedDate: "desc" },
    });
    return certificates.map((c) => ({
      id: c.id,
      certificateId: c.certificateId,
      courseName: c.course.name,
      issuedDate: c.issuedDate,
      status: c.status,
      pdfUrl: c.pdfUrl,
    }));
  }),

  verify: publicProcedure
    .input(z.object({ certificateId: z.string().min(1) }))
    .query(async ({ input }) => {
      const [certificate, settings] = await Promise.all([
        prisma.certificate.findUnique({
          where: { certificateId: input.certificateId },
          include: {
            student: { select: { name: true } },
            course: { select: { name: true, level: true } },
          },
        }),
        prisma.schoolSettings.findUnique({
          where: { id: "singleton" },
          select: { name: true },
        }),
      ]);

      const schoolName = settings?.name ?? "Buraq Horse Riding School";

      if (!certificate) {
        return { status: "INVALID" as const, schoolName };
      }

      return {
        status: certificate.status === "REVOKED" ? "REVOKED" : "VALID",
        schoolName,
        certificateId: certificate.certificateId,
        studentName: certificate.student.name,
        courseName: certificate.course.name,
        courseLevel: certificate.course.level,
        issuedDate: certificate.issuedDate,
        pdfUrl: certificate.pdfUrl,
        revokedReason: certificate.revokedReason,
      } as const;
    }),
});
