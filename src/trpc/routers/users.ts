import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { logAction } from "@/lib/audit";
import { generateStudentId } from "@/lib/ids";
import { prisma } from "@/lib/prisma";
import { adminProcedure, createTRPCRouter } from "../init";

/** Only the super-admin may grant/revoke the ADMIN role. */
function assertSuperAdmin(ctx: {
  session: { user: { isSuperAdmin?: boolean | null } };
}) {
  if (!ctx.session.user.isSuperAdmin) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only the super-admin can manage admin access.",
    });
  }
}

export const usersRouter = createTRPCRouter({
  list: adminProcedure.query(async ({ ctx }) => {
    const users = await prisma.user.findMany({
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        isSuperAdmin: true,
        photoUrl: true,
        studentId: true,
        instructorId: true,
      },
    });
    return {
      users,
      currentUserId: ctx.session.user.id,
      isSuperAdmin: Boolean(ctx.session.user.isSuperAdmin),
    };
  }),

  /** Promote an existing user to ADMIN. */
  makeAdmin: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      assertSuperAdmin(ctx);
      const target = await prisma.user.findUnique({
        where: { id: input.userId },
        select: { role: true },
      });
      if (!target) throw new TRPCError({ code: "NOT_FOUND" });
      if (target.role === "ADMIN") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User is already an admin.",
        });
      }
      await prisma.user.update({
        where: { id: input.userId },
        data: { role: "ADMIN", status: "ACTIVE" },
      });
      await logAction({
        actorId: ctx.session.user.id,
        actorName: ctx.session.user.name,
        action: "user.make_admin",
        entity: "User",
        entityId: input.userId,
      });
      return { ok: true };
    }),

  /** Demote an admin back to a student account. */
  revokeAdmin: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      assertSuperAdmin(ctx);
      if (input.userId === ctx.session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot change your own role.",
        });
      }
      const target = await prisma.user.findUnique({
        where: { id: input.userId },
        select: { isSuperAdmin: true, role: true, studentId: true },
      });
      if (!target) throw new TRPCError({ code: "NOT_FOUND" });
      if (target.isSuperAdmin) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "The super-admin's role cannot be changed.",
        });
      }
      if (target.role !== "ADMIN") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User is not an admin.",
        });
      }
      await prisma.user.update({
        where: { id: input.userId },
        data: {
          role: "STUDENT",
          studentId: target.studentId ?? generateStudentId(),
        },
      });
      await logAction({
        actorId: ctx.session.user.id,
        actorName: ctx.session.user.name,
        action: "user.revoke_admin",
        entity: "User",
        entityId: input.userId,
      });
      return { ok: true };
    }),
});
