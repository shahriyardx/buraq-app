import "server-only";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { prisma } from "@/lib/prisma";

type Role = "ADMIN" | "STUDENT";

/**
 * Creates a user + better-auth credential account directly (bypasses the
 * sign-up endpoint so it never touches the current admin's session/cookies).
 */
export async function createUserWithPassword(input: {
  name: string;
  email: string;
  password: string;
  role: Role;
  studentId?: string | null;
  phone?: string | null;
  dob?: Date | null;
  gender?: "MALE" | "FEMALE" | "OTHER" | null;
  address?: string | null;
  photoUrl?: string | null;
}) {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (existing) {
    throw new Error("A user with this email already exists.");
  }

  const id = randomUUID();
  const now = new Date();
  const user = await prisma.user.create({
    data: {
      id,
      name: input.name,
      email: input.email,
      emailVerified: true,
      role: input.role,
      status: "ACTIVE",
      studentId: input.studentId ?? null,
      phone: input.phone ?? null,
      dob: input.dob ?? null,
      gender: input.gender ?? null,
      address: input.address ?? null,
      photoUrl: input.photoUrl ?? null,
      createdAt: now,
      updatedAt: now,
    },
  });

  await prisma.account.create({
    data: {
      id: randomUUID(),
      accountId: id,
      providerId: "credential",
      userId: id,
      password: await hashPassword(input.password),
      createdAt: now,
      updatedAt: now,
    },
  });

  return user;
}

/** Sets/replaces the credential-account password for a user. */
export async function setUserPassword(userId: string, password: string) {
  const hashed = await hashPassword(password);
  const account = await prisma.account.findFirst({
    where: { userId, providerId: "credential" },
  });
  if (account) {
    await prisma.account.update({
      where: { id: account.id },
      data: { password: hashed, updatedAt: new Date() },
    });
  } else {
    await prisma.account.create({
      data: {
        id: randomUUID(),
        accountId: userId,
        providerId: "credential",
        userId,
        password: hashed,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }
}
