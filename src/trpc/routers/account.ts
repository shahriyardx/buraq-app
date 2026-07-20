import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createTRPCRouter, studentProcedure } from "../init";

export const accountRouter = createTRPCRouter({
  me: studentProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        name: true,
        email: true,
        studentId: true,
        phone: true,
        address: true,
        photoUrl: true,
        emailNotifications: true,
      },
    });
    return {
      name: user?.name ?? "",
      email: user?.email ?? "",
      studentId: user?.studentId ?? null,
      phone: user?.phone ?? null,
      address: user?.address ?? null,
      photoUrl: user?.photoUrl ?? null,
      emailNotifications: user?.emailNotifications ?? true,
    };
  }),

  updateProfile: studentProcedure
    .input(
      z.object({
        phone: z.string().nullish(),
        address: z.string().nullish(),
        photoUrl: z.string().url().nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await prisma.user.update({
        where: { id: ctx.session.user.id },
        data: {
          phone: input.phone ?? null,
          address: input.address ?? null,
          ...(input.photoUrl ? { photoUrl: input.photoUrl } : {}),
        },
      });
      return { ok: true };
    }),

  updateNotifications: studentProcedure
    .input(z.object({ emailNotifications: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await prisma.user.update({
        where: { id: ctx.session.user.id },
        data: { emailNotifications: input.emailNotifications },
      });
      return { ok: true };
    }),
});
