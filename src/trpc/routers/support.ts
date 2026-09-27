import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { logAction } from "@/lib/audit";
import { generateTicketId } from "@/lib/ids";
import { notifyAdmins, notifyStudent } from "@/lib/notify";
import { prisma } from "@/lib/prisma";
import { appUrl } from "@/lib/qr";

function categoryLabel(c: string) {
  return c.charAt(0) + c.slice(1).toLowerCase();
}

import { adminProcedure, createTRPCRouter, studentProcedure } from "../init";

const CATEGORIES = [
  "GENERAL",
  "BILLING",
  "COURSES",
  "TECHNICAL",
  "OTHER",
] as const;

const statusEnum = z.enum(["OPEN", "IN_PROGRESS", "RESOLVED"]);

export const supportRouter = createTRPCRouter({
  list: adminProcedure.query(async () => {
    const tickets = await prisma.supportTicket.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        student: { select: { name: true, studentId: true } },
        _count: { select: { messages: true } },
      },
    });
    return tickets.map((t) => ({
      id: t.id,
      ticketId: t.ticketId,
      subject: t.subject,
      studentName: t.student.name,
      studentId: t.student.studentId,
      category: t.category,
      status: t.status,
      messagesCount: t._count.messages,
    }));
  }),

  get: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const ticket = await prisma.supportTicket.findUnique({
        where: { id: input.id },
        include: {
          student: { select: { name: true, studentId: true } },
          messages: { orderBy: { createdAt: "asc" } },
        },
      });
      if (!ticket) throw new TRPCError({ code: "NOT_FOUND" });

      // Messages carry only authorId + role, so resolve display names in one query.
      const authorIds = [...new Set(ticket.messages.map((m) => m.authorId))];
      const authors = await prisma.user.findMany({
        where: { id: { in: authorIds } },
        select: { id: true, name: true },
      });
      const nameById = new Map(authors.map((a) => [a.id, a.name]));

      return {
        id: ticket.id,
        ticketId: ticket.ticketId,
        subject: ticket.subject,
        category: ticket.category,
        status: ticket.status,
        studentName: ticket.student.name,
        studentStudentId: ticket.student.studentId,
        messages: ticket.messages.map((m) => ({
          id: m.id,
          authorId: m.authorId,
          authorRole: m.authorRole,
          authorName: nameById.get(m.authorId) ?? null,
          body: m.body,
          attachmentUrl: m.attachmentUrl,
          createdAt: m.createdAt,
        })),
      };
    }),

  reply: adminProcedure
    .input(
      z.object({
        ticketId: z.string(),
        body: z.string().min(1, "Message cannot be empty"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const ticket = await prisma.supportTicket.findUnique({
        where: { id: input.ticketId },
        select: {
          id: true,
          ticketId: true,
          status: true,
          subject: true,
          studentId: true,
        },
      });
      if (!ticket) throw new TRPCError({ code: "NOT_FOUND" });

      await prisma.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          authorId: ctx.session.user.id,
          authorRole: "ADMIN",
          body: input.body,
        },
      });

      // First admin response moves an untouched ticket into progress.
      if (ticket.status === "OPEN") {
        await prisma.supportTicket.update({
          where: { id: ticket.id },
          data: { status: "IN_PROGRESS", assignedTo: ctx.session.user.id },
        });
      }

      // Notify the student of the admin reply.
      await notifyStudent({
        studentId: ticket.studentId,
        templateKey: "SUPPORT",
        vars: {
          subject: ticket.subject,
          ticketId: ticket.ticketId,
          message: input.body,
          ticketUrl: appUrl(`/student/support/${ticket.id}`),
        },
      });

      await logAction({
        actorId: ctx.session.user.id,
        actorName: ctx.session.user.name,
        action: "ticket.reply",
        entity: "SupportTicket",
        entityId: ticket.id,
        detail: ticket.ticketId,
      });

      return { ok: true };
    }),

  setStatus: adminProcedure
    .input(z.object({ ticketId: z.string(), status: statusEnum }))
    .mutation(async ({ ctx, input }) => {
      const ticket = await prisma.supportTicket.findUnique({
        where: { id: input.ticketId },
        select: { assignedTo: true },
      });
      if (!ticket) throw new TRPCError({ code: "NOT_FOUND" });

      await prisma.supportTicket.update({
        where: { id: input.ticketId },
        data: {
          status: input.status,
          // Claim the ticket when picking it up if nobody owns it yet.
          ...(input.status === "IN_PROGRESS" && !ticket.assignedTo
            ? { assignedTo: ctx.session.user.id }
            : {}),
        },
      });

      await logAction({
        actorId: ctx.session.user.id,
        actorName: ctx.session.user.name,
        action: "ticket.status",
        entity: "SupportTicket",
        entityId: input.ticketId,
        detail: input.status,
      });

      return { ok: true };
    }),

  myList: studentProcedure.query(async ({ ctx }) => {
    const tickets = await prisma.supportTicket.findMany({
      where: { studentId: ctx.session.user.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { messages: true } } },
    });
    return tickets.map((t) => ({
      id: t.id,
      ticketId: t.ticketId,
      subject: t.subject,
      category: t.category,
      status: t.status,
      messagesCount: t._count.messages,
    }));
  }),

  schoolInfo: studentProcedure.query(async () => {
    const school = await prisma.schoolSettings.findUnique({
      where: { id: "singleton" },
    });
    return {
      phone: school?.phone ?? null,
      email: school?.email ?? null,
      address: school?.address ?? null,
      officeHours: school?.officeHours ?? null,
    };
  }),

  studentGet: studentProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const ticket = await prisma.supportTicket.findUnique({
        where: { id: input.id },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });
      // A student may only view their own tickets.
      if (!ticket || ticket.studentId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      // Admin replies carry only authorId; resolve their names in one query.
      const adminIds = [
        ...new Set(
          ticket.messages
            .filter((m) => m.authorRole === "ADMIN")
            .map((m) => m.authorId),
        ),
      ];
      const admins = adminIds.length
        ? await prisma.user.findMany({
            where: { id: { in: adminIds } },
            select: { id: true, name: true },
          })
        : [];
      const nameById = new Map(admins.map((a) => [a.id, a.name]));

      return {
        id: ticket.id,
        ticketId: ticket.ticketId,
        subject: ticket.subject,
        category: ticket.category,
        status: ticket.status,
        messages: ticket.messages.map((m) => ({
          id: m.id,
          authorId: m.authorId,
          authorRole: m.authorRole,
          authorName: nameById.get(m.authorId) ?? null,
          body: m.body,
          attachmentUrl: m.attachmentUrl,
          createdAt: m.createdAt,
        })),
      };
    }),

  submit: studentProcedure
    .input(
      z.object({
        subject: z.string().min(1, "Subject is required"),
        category: z.enum(CATEGORIES),
        message: z.string().min(1, "Message cannot be empty"),
        attachmentUrl: z.string().url().nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // The ticket and its opening message are created together so the thread
      // is never empty.
      const ticket = await prisma.supportTicket.create({
        data: {
          ticketId: generateTicketId(),
          studentId: ctx.session.user.id,
          subject: input.subject,
          category: input.category,
          status: "OPEN",
          messages: {
            create: {
              authorId: ctx.session.user.id,
              authorRole: "STUDENT",
              body: input.message,
              attachmentUrl: input.attachmentUrl ?? null,
            },
          },
        },
      });

      const vars = {
        ticketId: ticket.ticketId,
        subject: ticket.subject,
        category: categoryLabel(ticket.category),
      };
      await notifyStudent({
        studentId: ctx.session.user.id,
        templateKey: "TICKET_RECEIVED",
        vars: { ...vars, ticketUrl: appUrl(`/student/support/${ticket.id}`) },
      });
      await notifyAdmins({
        key: "ADMIN_NEW_TICKET",
        vars: {
          ...vars,
          studentName: ctx.session.user.name,
          message: input.message,
          ticketUrl: appUrl(`/admin/support/${ticket.id}`),
        },
      });
      return { id: ticket.id };
    }),

  studentReply: studentProcedure
    .input(
      z.object({
        ticketId: z.string(),
        body: z.string().min(1, "Message cannot be empty"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const ticket = await prisma.supportTicket.findUnique({
        where: { id: input.ticketId },
        select: { id: true, studentId: true, status: true },
      });
      // A student may only reply to their own tickets.
      if (!ticket || ticket.studentId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await prisma.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          authorId: ctx.session.user.id,
          authorRole: "STUDENT",
          body: input.body,
        },
      });

      // A new student reply reopens a ticket the admin had marked resolved.
      if (ticket.status === "RESOLVED") {
        await prisma.supportTicket.update({
          where: { id: ticket.id },
          data: { status: "OPEN" },
        });
      }

      return { ok: true };
    }),
});
