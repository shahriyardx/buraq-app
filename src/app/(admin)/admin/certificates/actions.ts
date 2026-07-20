"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAction } from "@/lib/audit";
import { requireAdmin } from "@/lib/dal";
import { type ActionState, str } from "@/lib/form";
import { formatDate } from "@/lib/format";
import { generateCertificateId } from "@/lib/ids";
import { renderCertificatePdf } from "@/lib/pdf/certificate";
import { prisma } from "@/lib/prisma";
import { appUrl, qrDataUrl } from "@/lib/qr";
import { isR2Configured, uploadBufferToR2 } from "@/lib/r2";

const generateSchema = z.object({
  studentId: z.string().min(1, "Select a student"),
  courseId: z.string().min(1, "Select a course"),
});

export async function generateCertificateAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();

  const parsed = generateSchema.safeParse({
    studentId: str(fd, "studentId"),
    courseId: str(fd, "courseId"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  try {
    const [student, course] = await Promise.all([
      prisma.user.findUnique({
        where: { id: parsed.data.studentId },
        select: { id: true, name: true },
      }),
      prisma.course.findUnique({
        where: { id: parsed.data.courseId },
        select: { id: true, name: true, level: true },
      }),
    ]);
    if (!student) return { status: "error", message: "Student not found." };
    if (!course) return { status: "error", message: "Course not found." };

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

    let pdfUrl: string | null = null;
    if (isR2Configured()) {
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
      });
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

    await logAction({
      actorId: session.user.id,
      actorName: session.user.name,
      action: "certificate.generate",
      entity: "Certificate",
      entityId: certificate.id,
      detail: certificateId,
    });

    revalidatePath("/admin/certificates");
    return {
      status: "success",
      message: `Certificate ${certificateId} issued for ${student.name}.`,
    };
  } catch (err) {
    return { status: "error", message: (err as Error).message };
  }
}

export async function revokeCertificateAction(
  certificateId: string,
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();

  const reason = str(fd, "reason");
  if (!reason) {
    return { status: "error", message: "A revocation reason is required." };
  }

  try {
    const certificate = await prisma.certificate.update({
      where: { certificateId },
      data: {
        status: "REVOKED",
        revokedReason: reason,
        revokedAt: new Date(),
      },
    });

    await logAction({
      actorId: session.user.id,
      actorName: session.user.name,
      action: "certificate.revoke",
      entity: "Certificate",
      entityId: certificate.id,
      detail: reason,
    });

    revalidatePath("/admin/certificates");
    return {
      status: "success",
      message: `Certificate ${certificateId} revoked.`,
    };
  } catch (err) {
    return { status: "error", message: (err as Error).message };
  }
}
