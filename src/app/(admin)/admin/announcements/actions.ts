"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAction } from "@/lib/audit";
import { requireAdmin } from "@/lib/dal";
import { type ActionState, str } from "@/lib/form";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  title: z.string().min(2, "Title is required"),
  body: z.string().min(2, "Message is required"),
});

export async function createAnnouncementAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();
  const parsed = schema.safeParse({
    title: str(fd, "title"),
    body: str(fd, "body"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const a = await prisma.announcement.create({
    data: { ...parsed.data, authorId: session.user.id },
  });
  await logAction({
    actorId: session.user.id,
    actorName: session.user.name,
    action: "announcement.create",
    entity: "Announcement",
    entityId: a.id,
    detail: a.title,
  });
  revalidatePath("/admin/announcements");
  return { status: "success", message: "Announcement published." };
}

export async function deleteAnnouncementAction(id: string) {
  const session = await requireAdmin();
  await prisma.announcement.delete({ where: { id } });
  await logAction({
    actorId: session.user.id,
    actorName: session.user.name,
    action: "announcement.delete",
    entity: "Announcement",
    entityId: id,
  });
  revalidatePath("/admin/announcements");
}
