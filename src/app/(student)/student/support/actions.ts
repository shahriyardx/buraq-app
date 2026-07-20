"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStudent } from "@/lib/dal";
import { type ActionState, file, str } from "@/lib/form";
import { generateTicketId } from "@/lib/ids";
import { prisma } from "@/lib/prisma";
import { isR2Configured, uploadToR2 } from "@/lib/r2";

const CATEGORIES = [
  "GENERAL",
  "BILLING",
  "COURSES",
  "TECHNICAL",
  "OTHER",
] as const;

const submitSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  category: z.enum(CATEGORIES),
  message: z.string().min(1, "Message cannot be empty"),
});

export async function submitTicketAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const session = await requireStudent();

  const parsed = submitSchema.safeParse({
    subject: str(fd, "subject"),
    category: str(fd, "category"),
    message: str(fd, "message"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  try {
    let attachmentUrl: string | null = null;
    const attachment = file(fd, "attachment");
    if (attachment && isR2Configured()) {
      attachmentUrl = await uploadToR2(attachment, "tickets");
    }

    // The ticket and its opening message are created together so the thread is
    // never empty.
    await prisma.supportTicket.create({
      data: {
        ticketId: generateTicketId(),
        studentId: session.user.id,
        subject: parsed.data.subject,
        category: parsed.data.category,
        status: "OPEN",
        messages: {
          create: {
            authorId: session.user.id,
            authorRole: "STUDENT",
            body: parsed.data.message,
            attachmentUrl,
          },
        },
      },
    });

    revalidatePath("/student/support");
    return { status: "success", message: "Ticket submitted." };
  } catch (err) {
    return { status: "error", message: (err as Error).message };
  }
}

const replySchema = z.object({
  body: z.string().min(1, "Message cannot be empty"),
});

export async function replyTicketAction(
  ticketId: string,
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const session = await requireStudent();

  const parsed = replySchema.safeParse({ body: str(fd, "body") });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  try {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { id: true, studentId: true, status: true },
    });
    // A student may only reply to their own tickets.
    if (!ticket || ticket.studentId !== session.user.id) {
      return { status: "error", message: "Ticket not found." };
    }

    await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        authorId: session.user.id,
        authorRole: "STUDENT",
        body: parsed.data.body,
      },
    });

    // A new student reply reopens a ticket the admin had marked resolved.
    if (ticket.status === "RESOLVED") {
      await prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { status: "OPEN" },
      });
    }

    revalidatePath("/student/support");
    revalidatePath(`/student/support/${ticket.id}`);
    return { status: "success", message: "Reply sent." };
  } catch (err) {
    return { status: "error", message: (err as Error).message };
  }
}
