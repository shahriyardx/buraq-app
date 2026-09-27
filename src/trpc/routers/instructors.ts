import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { logAction } from "@/lib/audit";
import { generateInstructorId } from "@/lib/ids";
import { notifyAccountCreated } from "@/lib/notify";
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
  bio: z.string().nullish(),
  specialties: z.string().nullish(),
  photoUrl: z.string().url().nullish(),
});

function toDate(v?: string | null) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const instructorsRouter = createTRPCRouter({
  list: adminProcedure.query(async () => {
    const instructors = await prisma.user.findMany({
      where: { role: "INSTRUCTOR" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        instructorId: true,
        phone: true,
        specialties: true,
        status: true,
        photoUrl: true,
        _count: { select: { coursesTaught: true } },
      },
    });
    return instructors.map((i) => ({
      id: i.id,
      name: i.name,
      email: i.email,
      instructorId: i.instructorId,
      phone: i.phone,
      specialties: i.specialties,
      status: i.status,
      photoUrl: i.photoUrl,
      coursesCount: i._count.coursesTaught,
    }));
  }),

  /** Active instructors for course/session assignment selects. */
  options: adminProcedure.query(async () => {
    return prisma.user.findMany({
      where: { role: "INSTRUCTOR", status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
  }),

  get: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const i = await prisma.user.findFirst({
        where: { id: input.id, role: "INSTRUCTOR" },
        include: {
          coursesTaught: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              name: true,
              status: true,
              _count: { select: { enrollments: true } },
            },
          },
          sessionsTaught: {
            orderBy: { date: "desc" },
            take: 10,
            include: { course: { select: { name: true } } },
          },
        },
      });
      if (!i) throw new TRPCError({ code: "NOT_FOUND" });

      return {
        id: i.id,
        name: i.name,
        email: i.email,
        instructorId: i.instructorId,
        phone: i.phone,
        gender: i.gender,
        address: i.address,
        dob: i.dob,
        bio: i.bio,
        specialties: i.specialties,
        photoUrl: i.photoUrl,
        status: i.status,
        createdAt: i.createdAt,
        courses: i.coursesTaught.map((c) => ({
          id: c.id,
          name: c.name,
          status: c.status,
          enrolledCount: c._count.enrollments,
        })),
        sessions: i.sessionsTaught.map((s) => ({
          id: s.id,
          courseName: s.course.name,
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime,
        })),
      };
    }),

  create: adminProcedure
    .input(
      profileInput.extend({
        password: z.string().min(8, "Password must be at least 8 characters"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const instructor = await createUserWithPassword({
        name: input.name,
        email: input.email,
        password: input.password,
        role: "INSTRUCTOR",
        instructorId: generateInstructorId(),
        phone: input.phone ?? null,
        gender: input.gender ?? null,
        address: input.address ?? null,
        dob: toDate(input.dob),
        bio: input.bio ?? null,
        specialties: input.specialties ?? null,
        photoUrl: input.photoUrl ?? null,
      });
      await notifyAccountCreated({ ...instructor, role: "INSTRUCTOR" });

      await logAction({
        actorId: ctx.session.user.id,
        actorName: ctx.session.user.name,
        action: "instructor.create",
        entity: "User",
        entityId: instructor.id,
        detail: instructor.email,
      });
      return { id: instructor.id, name: instructor.name };
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
          bio: input.bio ?? null,
          specialties: input.specialties ?? null,
          ...(input.photoUrl ? { photoUrl: input.photoUrl } : {}),
        },
      });
      // Keep the denormalized display name on taught courses/sessions in sync.
      await Promise.all([
        prisma.course.updateMany({
          where: { instructorUserId: input.id },
          data: { instructor: input.name },
        }),
        prisma.classSession.updateMany({
          where: { instructorUserId: input.id },
          data: { instructor: input.name },
        }),
      ]);
      await logAction({
        actorId: ctx.session.user.id,
        actorName: ctx.session.user.name,
        action: "instructor.update",
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
          input.status === "ACTIVE"
            ? "instructor.activate"
            : "instructor.deactivate",
        entity: "User",
        entityId: input.id,
      });
      return { ok: true };
    }),
});
