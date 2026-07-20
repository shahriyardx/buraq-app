import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createUserWithPassword } from "@/lib/users";
import { createTRPCRouter, publicProcedure } from "../init";

async function adminCount() {
  return prisma.user.count({ where: { role: "ADMIN" } });
}

export const bootstrapRouter = createTRPCRouter({
  /** True when the app has no admin yet — the first-admin setup is available. */
  needsSetup: publicProcedure.query(async () => {
    return (await adminCount()) === 0;
  }),

  /**
   * Creates the very first admin (a super-admin). Only works while no admin
   * exists — hard-guarded server-side against a race / repeat call.
   */
  createFirstAdmin: publicProcedure
    .input(
      z.object({
        name: z.string().min(2, "Name is required"),
        email: z.string().email("Valid email required"),
        password: z.string().min(8, "Password must be at least 8 characters"),
      }),
    )
    .mutation(async ({ input }) => {
      if ((await adminCount()) > 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "An administrator already exists.",
        });
      }
      const user = await createUserWithPassword({
        name: input.name,
        email: input.email,
        password: input.password,
        role: "ADMIN",
      });
      await prisma.user.update({
        where: { id: user.id },
        data: { isSuperAdmin: true },
      });
      return { ok: true };
    }),
});
