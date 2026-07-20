"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAction } from "@/lib/audit";
import { parseCsv } from "@/lib/csv";
import { requireAdmin } from "@/lib/dal";
import { enrollStudent } from "@/lib/enrollments";
import { type ActionState, file, optDate, optStr, str } from "@/lib/form";
import { generateStudentId } from "@/lib/ids";
import { prisma } from "@/lib/prisma";
import { isR2Configured, uploadToR2 } from "@/lib/r2";
import { createUserWithPassword } from "@/lib/users";

const genderEnum = z.enum(["MALE", "FEMALE", "OTHER"]).nullable();

const baseSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().nullable(),
  gender: genderEnum,
  address: z.string().nullable(),
});

export async function createStudentAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();

  const parsed = baseSchema
    .extend({
      password: z.string().min(8, "Password must be at least 8 characters"),
    })
    .safeParse({
      name: str(fd, "name"),
      email: str(fd, "email"),
      phone: optStr(fd, "phone"),
      gender: optStr(fd, "gender") as never,
      address: optStr(fd, "address"),
      password: str(fd, "password"),
    });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  try {
    let photoUrl: string | null = null;
    const photo = file(fd, "photo");
    if (photo && isR2Configured()) {
      photoUrl = await uploadToR2(photo, "students");
    }

    const student = await createUserWithPassword({
      ...parsed.data,
      role: "STUDENT",
      studentId: generateStudentId(),
      dob: optDate(fd, "dob"),
      photoUrl,
    });

    const courseId = optStr(fd, "courseId");
    if (courseId) {
      await enrollStudent({ studentId: student.id, courseId });
    }

    await logAction({
      actorId: session.user.id,
      actorName: session.user.name,
      action: "student.create",
      entity: "User",
      entityId: student.id,
      detail: student.email,
    });

    revalidatePath("/admin/students");
    return { status: "success", message: `Student ${student.name} added.` };
  } catch (err) {
    return { status: "error", message: (err as Error).message };
  }
}

export async function updateStudentAction(
  studentId: string,
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();

  const parsed = baseSchema.safeParse({
    name: str(fd, "name"),
    email: str(fd, "email"),
    phone: optStr(fd, "phone"),
    gender: optStr(fd, "gender") as never,
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
      where: { id: studentId },
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        gender: parsed.data.gender,
        address: parsed.data.address,
        dob: optDate(fd, "dob"),
        ...(photoUrl ? { photoUrl } : {}),
      },
    });

    await logAction({
      actorId: session.user.id,
      actorName: session.user.name,
      action: "student.update",
      entity: "User",
      entityId: studentId,
    });

    revalidatePath("/admin/students");
    revalidatePath(`/admin/students/${studentId}`);
    return { status: "success", message: "Student updated." };
  } catch (err) {
    return { status: "error", message: (err as Error).message };
  }
}

export async function setStudentStatusAction(
  studentId: string,
  status: "ACTIVE" | "INACTIVE",
) {
  const session = await requireAdmin();
  await prisma.user.update({ where: { id: studentId }, data: { status } });
  await logAction({
    actorId: session.user.id,
    actorName: session.user.name,
    action: status === "ACTIVE" ? "student.activate" : "student.deactivate",
    entity: "User",
    entityId: studentId,
  });
  revalidatePath("/admin/students");
  revalidatePath(`/admin/students/${studentId}`);
}

export async function bulkImportStudentsAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();
  const csv = file(fd, "csv");
  if (!csv) return { status: "error", message: "Please choose a CSV file." };

  const text = await csv.text();
  const rows = parseCsv<{
    name?: string;
    email?: string;
    phone?: string;
    gender?: string;
    address?: string;
    password?: string;
  }>(text);

  if (rows.length === 0) {
    return { status: "error", message: "CSV has no data rows." };
  }

  let created = 0;
  const failures: string[] = [];
  for (const row of rows) {
    const name = row.name?.trim();
    const email = row.email?.trim();
    if (!name || !email) {
      failures.push(`Missing name/email in a row`);
      continue;
    }
    try {
      const gender = ["MALE", "FEMALE", "OTHER"].includes(
        (row.gender ?? "").toUpperCase(),
      )
        ? ((row.gender as string).toUpperCase() as "MALE" | "FEMALE" | "OTHER")
        : null;
      await createUserWithPassword({
        name,
        email,
        password: row.password?.trim() || "Student@123",
        role: "STUDENT",
        studentId: generateStudentId(),
        phone: row.phone?.trim() || null,
        gender,
        address: row.address?.trim() || null,
      });
      created++;
    } catch (err) {
      failures.push(`${email}: ${(err as Error).message}`);
    }
  }

  await logAction({
    actorId: session.user.id,
    actorName: session.user.name,
    action: "student.bulk_import",
    detail: `${created} created, ${failures.length} failed`,
  });

  revalidatePath("/admin/students");
  const msg =
    `Imported ${created} student${created === 1 ? "" : "s"}.` +
    (failures.length ? ` ${failures.length} failed.` : "");
  return {
    status: failures.length && !created ? "error" : "success",
    message: msg,
  };
}
