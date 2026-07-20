import { z } from "zod";
import { logAction } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { adminProcedure, createTRPCRouter, studentProcedure } from "../init";

export const announcementsRouter = createTRPCRouter({
  list: adminProcedure.query(async () => {
    const rows = await prisma.announcement.findMany({
      orderBy: { publishedAt: "desc" },
    });

    // Resolve author names in one query.
    const authorIds = [...new Set(rows.map((r) => r.authorId))];
    const authors = await prisma.user.findMany({
      where: { id: { in: authorIds } },
      select: { id: true, name: true },
    });
    const nameById = new Map(authors.map((a) => [a.id, a.name]));

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      authorName: nameById.get(r.authorId) ?? null,
      publishedAt: r.publishedAt,
    }));
  }),

  create: adminProcedure
    .input(
      z.object({
        title: z.string().min(2, "Title is required"),
        body: z.string().min(2, "Message is required"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const a = await prisma.announcement.create({
        data: { ...input, authorId: ctx.session.user.id },
      });
      await logAction({
        actorId: ctx.session.user.id,
        actorName: ctx.session.user.name,
        action: "announcement.create",
        entity: "Announcement",
        entityId: a.id,
        detail: a.title,
      });
      return { id: a.id };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await prisma.announcement.delete({ where: { id: input.id } });
      await logAction({
        actorId: ctx.session.user.id,
        actorName: ctx.session.user.name,
        action: "announcement.delete",
        entity: "Announcement",
        entityId: input.id,
      });
      return { ok: true };
    }),

  latest: studentProcedure
    .input(
      z.object({ take: z.number().int().min(1).max(20).default(3) }).optional(),
    )
    .query(async ({ input }) => {
      const rows = await prisma.announcement.findMany({
        orderBy: { publishedAt: "desc" },
        take: input?.take ?? 3,
      });
      return rows.map((a) => ({
        id: a.id,
        title: a.title,
        body: a.body,
        publishedAt: a.publishedAt,
      }));
    }),
});
