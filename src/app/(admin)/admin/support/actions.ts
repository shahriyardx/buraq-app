"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAction } from "@/lib/audit";
import { requireAdmin } from "@/lib/dal";
import { type ActionState, str } from "@/lib/form";
import { prisma } from "@/lib/prisma";

const replySchema = z.object({
  body: z.string().min(1, "Message cannot be empty"),
});

export async function replyTicketAction(
  ticketId: string,
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();

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
      select: { id: true, ticketId: true, status: true },
    });
    if (!ticket) return { status: "error", message: "Ticket not found." };

    await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        authorId: session.user.id,
        authorRole: "ADMIN",
        body: parsed.data.body,
      },
    });

    // First admin response moves an untouched ticket into progress.
    if (ticket.status === "OPEN") {
      await prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { status: "IN_PROGRESS", assignedTo: session.user.id },
      });
    }

    await logAction({
      actorId: session.user.id,
      actorName: session.user.name,
      action: "ticket.reply",
      entity: "SupportTicket",
      entityId: ticket.id,
      detail: ticket.ticketId,
    });

    revalidatePath("/admin/support");
    revalidatePath(`/admin/support/${ticket.id}`);
    return { status: "success", message: "Reply sent." };
  } catch (err) {
    return { status: "error", message: (err as Error).message };
  }
}

export async function setTicketStatusAction(
  ticketId: string,
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED",
) {
  const session = await requireAdmin();

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    select: { assignedTo: true },
  });
  if (!ticket) return;

  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: {
      status,
      // Claim the ticket when picking it up if nobody owns it yet.
      ...(status === "IN_PROGRESS" && !ticket.assignedTo
        ? { assignedTo: session.user.id }
        : {}),
    },
  });

  await logAction({
    actorId: session.user.id,
    actorName: session.user.name,
    action: "ticket.status",
    entity: "SupportTicket",
    entityId: ticketId,
    detail: status,
  });

  revalidatePath("/admin/support");
  revalidatePath(`/admin/support/${ticketId}`);
}
