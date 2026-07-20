"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStudent } from "@/lib/dal";
import { type ActionState, file, optStr } from "@/lib/form";
import { prisma } from "@/lib/prisma";
import { isR2Configured, uploadToR2 } from "@/lib/r2";

const profileSchema = z.object({
  phone: z.string().nullable(),
  address: z.string().nullable(),
});

export async function updateProfileAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const session = await requireStudent();

  const parsed = profileSchema.safeParse({
    phone: optStr(fd, "phone"),
    address: optStr(fd, "address"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  try {
    let photoUrl: string | undefined;
    const photo = file(fd, "photo");
    if (photo && isR2Configured()) {
      photoUrl = await uploadToR2(photo, "students");
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        phone: parsed.data.phone,
        address: parsed.data.address,
        ...(photoUrl ? { photoUrl } : {}),
      },
    });

    revalidatePath("/student/settings");
    return { status: "success", message: "Profile updated." };
  } catch (err) {
    return { status: "error", message: (err as Error).message };
  }
}

export async function updateNotificationsAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const session = await requireStudent();

  // The checkbox only submits a value when checked, so presence == enabled.
  const emailNotifications = fd.get("emailNotifications") !== null;

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { emailNotifications },
    });

    revalidatePath("/student/settings");
    return {
      status: "success",
      message: emailNotifications
        ? "Email alerts enabled."
        : "Email alerts disabled.",
    };
  } catch (err) {
    return { status: "error", message: (err as Error).message };
  }
}
