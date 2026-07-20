import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

type LogInput = {
  actorId?: string | null;
  actorName?: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  detail?: string;
};

/** Records an admin action to the audit log. Best-effort — never throws. */
export async function logAction(input: LogInput) {
  try {
    const h = await headers();
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      null;
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        actorName: input.actorName ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        detail: input.detail,
        ip,
      },
    });
  } catch (err) {
    console.error("audit log failed", err);
  }
}
