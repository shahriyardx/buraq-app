import { initTRPC, TRPCError } from "@trpc/server";
import { cache } from "react";
import superjson from "superjson";
import { getSession } from "@/lib/dal";

/**
 * Request context. Resolves the better-auth session once per request (cached).
 * Used by both the HTTP route handler and the RSC server caller.
 */
export const createTRPCContext = cache(async () => {
  const session = await getSession();
  return { session };
});

type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create({ transformer: superjson });

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const publicProcedure = t.procedure;

/** Any signed-in user. */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { session: ctx.session } });
});

/** Admin only. */
export const adminProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) throw new TRPCError({ code: "UNAUTHORIZED" });
  if (ctx.session.user.role !== "ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admins only" });
  }
  if (ctx.session.user.status === "INACTIVE") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Account inactive" });
  }
  return next({ ctx: { session: ctx.session } });
});

/** Student only. */
export const studentProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) throw new TRPCError({ code: "UNAUTHORIZED" });
  if (ctx.session.user.role !== "STUDENT") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Students only" });
  }
  if (ctx.session.user.status === "INACTIVE") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Account inactive" });
  }
  return next({ ctx: { session: ctx.session } });
});
