import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { sendTemplateEmail } from "@/lib/notify";
import { prisma } from "@/lib/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    // Admin-provisioned accounts; disable public sign-up UI (no verify email flow).
    requireEmailVerification: false,
    async sendResetPassword({ user, url }) {
      await sendTemplateEmail({
        key: "PASSWORD_RESET",
        to: { email: user.email, name: user.name },
        vars: { resetUrl: url },
      });
    },
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
      isSuperAdmin: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
      studentId: { type: "string", required: false, input: false },
      instructorId: { type: "string", required: false, input: false },
      bio: { type: "string", required: false },
      specialties: { type: "string", required: false },
      phone: { type: "string", required: false },
      dob: { type: "date", required: false },
      gender: { type: "string", required: false },
      address: { type: "string", required: false },
      photoUrl: { type: "string", required: false },
      emailNotifications: {
        type: "boolean",
        required: false,
        defaultValue: true,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh daily
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
