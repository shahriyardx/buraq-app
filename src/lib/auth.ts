import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { sendEmail } from "@/lib/email";
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
      await sendEmail({
        to: user.email,
        subject: "Reset your Buraq Horse Riding School password",
        text: `Hi ${user.name},\n\nReset your password using the link below:\n${url}\n\nIf you didn't request this, you can ignore this email.`,
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
      studentId: { type: "string", required: false, input: false },
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
