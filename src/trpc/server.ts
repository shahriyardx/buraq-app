import "server-only";
import { createCallerFactory, createTRPCContext } from "./init";
import { appRouter } from "./routers/_app";

/**
 * Server-side tRPC caller for use in Server Components / Route Handlers.
 * Call procedures directly: `const rows = await api.students.list();`
 */
export const api = createCallerFactory(appRouter)(createTRPCContext);
