import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { logAction } from "@/lib/audit";
import { parseCsv } from "@/lib/csv";
import { enrollStudent } from "@/lib/enrollments";
import { generateStudentId } from "@/lib/ids";
import { prisma } from "@/lib/prisma";
import { createUserWithPassword } from "@/lib/users";
import { adminProcedure, createTRPCRouter } from "../init";

const genderEnum = z.enum(["MALE", "FEMALE", "OTHER"]);

const profileInput = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().nullish(),
  gender: genderEnum.nullish(),
  address: z.string().nullish(),
  dob: z.string().nullish(), // yyyy-mm-dd
  photoUrl: z.string().url().nullish(),
});

function toDate(v?: string | null) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const studentsRouter = createTRPCRouter({
  list: adminProcedure.query(async () => {
    const students = await prisma.user.findMany({
      where: { role: "STUDENT" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        studentId: true,
        phone: true,
        status: true,
        photoUrl: true,
        _count: { select: { enrollments: true } },
      },
    });
    return students.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      studentId: s.studentId,
      phone: s.phone,
      status: s.status,
      photoUrl: s.photoUrl,
      coursesCount: s._count.enrollments,
    }));
  }),

  courseOptions: adminProcedure.query(async () => {
    return prisma.course.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
  }),

  get: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const s = await prisma.user.findFirst({
        where: { id: input.id, role: "STUDENT" },
        include: {
          enrollments: {
            include: { course: { select: { name: true } } },
            orderBy: { createdAt: "desc" },
          },
          attendances: {
            include: { course: { select: { name: true } } },
            orderBy: { date: "desc" },
            take: 20,
          },
          certificates: {
            include: { course: { select: { name: true } } },
            orderBy: { issuedDate: "desc" },
          },
          invoices: {
            include: { course: { select: { name: true } } },
            orderBy: { createdAt: "desc" },
          },
        },
      });
      if (!s) throw new TRPCError({ code: "NOT_FOUND" });

      return {
        id: s.id,
        name: s.name,
        email: s.email,
        studentId: s.studentId,
        phone: s.phone,
        gender: s.gender,
        address: s.address,
        dob: s.dob,
        photoUrl: s.photoUrl,
        status: s.status,
        createdAt: s.createdAt,
        enrollments: s.enrollments.map((e) => ({
          id: e.id,
          courseId: e.courseId,
          courseName: e.course.name,
          progress: e.progress,
          status: e.status,
        })),
        attendances: s.attendances.map((a) => ({
          id: a.id,
          date: a.date,
          courseName: a.course.name,
          status: a.status,
        })),
        certificates: s.certificates.map((c) => ({
          id: c.id,
          certificateId: c.certificateId,
          courseName: c.course.name,
          issuedDate: c.issuedDate,
          status: c.status,
        })),
        invoices: s.invoices.map((i) => ({
          id: i.id,
          invoiceNumber: i.invoiceNumber,
          courseName: i.course?.name ?? null,
          amount: i.amount.toString(),
          dueDate: i.dueDate,
          status: i.status,
        })),
      };
    }),

  create: adminProcedure
    .input(
      profileInput.extend({
        password: z.string().min(8, "Password must be at least 8 characters"),
        courseId: z.string().nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const student = await createUserWithPassword({
        name: input.name,
        email: input.email,
        password: input.password,
        role: "STUDENT",
        studentId: generateStudentId(),
        phone: input.phone ?? null,
        gender: input.gender ?? null,
        address: input.address ?? null,
        dob: toDate(input.dob),
        photoUrl: input.photoUrl ?? null,
      });

      if (input.courseId) {
        await enrollStudent({
          studentId: student.id,
          courseId: input.courseId,
        });
      }

      await logAction({
        actorId: ctx.session.user.id,
        actorName: ctx.session.user.name,
        action: "student.create",
        entity: "User",
        entityId: student.id,
        detail: student.email,
      });
      return { id: student.id, name: student.name };
    }),

  update: adminProcedure
    .input(profileInput.extend({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await prisma.user.update({
        where: { id: input.id },
        data: {
          name: input.name,
          email: input.email,
          phone: input.phone ?? null,
          gender: input.gender ?? null,
          address: input.address ?? null,
          dob: toDate(input.dob),
          ...(input.photoUrl ? { photoUrl: input.photoUrl } : {}),
        },
      });
      await logAction({
        actorId: ctx.session.user.id,
        actorName: ctx.session.user.name,
        action: "student.update",
        entity: "User",
        entityId: input.id,
      });
      return { ok: true };
    }),

  setStatus: adminProcedure
    .input(z.object({ id: z.string(), status: z.enum(["ACTIVE", "INACTIVE"]) }))
    .mutation(async ({ ctx, input }) => {
      await prisma.user.update({
        where: { id: input.id },
        data: { status: input.status },
      });
      await logAction({
        actorId: ctx.session.user.id,
        actorName: ctx.session.user.name,
        action:
          input.status === "ACTIVE" ? "student.activate" : "student.deactivate",
        entity: "User",
        entityId: input.id,
      });
      return { ok: true };
    }),

  bulkImport: adminProcedure
    .input(z.object({ csv: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const rows = parseCsv<{
        name?: string;
        email?: string;
        phone?: string;
        gender?: string;
        address?: string;
        password?: string;
      }>(input.csv);
      if (rows.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "CSV has no data rows.",
        });
      }

      let created = 0;
      const failures: string[] = [];
      for (const row of rows) {
        const name = row.name?.trim();
        const email = row.email?.trim();
        if (!name || !email) {
          failures.push("Missing name/email in a row");
          continue;
        }
        try {
          const g = (row.gender ?? "").toUpperCase();
          const gender = ["MALE", "FEMALE", "OTHER"].includes(g)
            ? (g as "MALE" | "FEMALE" | "OTHER")
            : null;
          await createUserWithPassword({
            name,
            email,
            password: row.password?.trim() || "Student@123",
            role: "STUDENT",
            studentId: generateStudentId(),
            phone: row.phone?.trim() || null,
            gender,
            address: row.address?.trim() || null,
          });
          created++;
        } catch (err) {
          failures.push(`${email}: ${(err as Error).message}`);
        }
      }

      await logAction({
        actorId: ctx.session.user.id,
        actorName: ctx.session.user.name,
        action: "student.bulk_import",
        detail: `${created} created, ${failures.length} failed`,
      });
      return { created, failed: failures.length };
    }),
});
