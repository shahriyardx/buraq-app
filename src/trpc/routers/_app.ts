import { createTRPCRouter } from "../init";
import { studentsRouter } from "./students";

/**
 * Root tRPC router. Domain routers are merged in as they are built.
 */
export const appRouter = createTRPCRouter({
  students: studentsRouter,
});

export type AppRouter = typeof appRouter;
