import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    // Admin-provisioned accounts; disable public sign-up UI (no verify email flow).
    requireEmailVerification: false,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "STUDENT",
        input: false, // set server-side only, never from client sign-up payload
      },
      status: {
        type: "string",
        required: false,
        defaultValue: "ACTIVE",
        input: false,
      },
      studentId: { type: "string", required: false, input: false },
      phone: { type: "string", required: false },
      dob: { type: "date", required: false },
      gender: { type: "string", required: false },
      address: { type: "string", required: false },
      photoUrl: { type: "string", required: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh daily
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
