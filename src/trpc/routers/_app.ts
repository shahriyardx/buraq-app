import { createTRPCRouter } from "../init";
import { accountRouter } from "./account";
import { announcementsRouter } from "./announcements";
import { attendanceRouter } from "./attendance";
import { bookingsRouter } from "./bookings";
import { bootstrapRouter } from "./bootstrap";
import { certificatesRouter } from "./certificates";
import { coursesRouter } from "./courses";
import { dashboardRouter } from "./dashboard";
import { instructorRouter } from "./instructor";
import { instructorsRouter } from "./instructors";
import { invoicesRouter } from "./invoices";
import { settingsRouter } from "./settings";
import { studentsRouter } from "./students";
import { supportRouter } from "./support";

/**
 * Root tRPC router. One domain router per module.
 */
export const appRouter = createTRPCRouter({
  students: studentsRouter,
  instructors: instructorsRouter,
  instructor: instructorRouter,
  courses: coursesRouter,
  attendance: attendanceRouter,
  certificates: certificatesRouter,
  invoices: invoicesRouter,
  support: supportRouter,
  settings: settingsRouter,
  announcements: announcementsRouter,
  bookings: bookingsRouter,
  dashboard: dashboardRouter,
  account: accountRouter,
  bootstrap: bootstrapRouter,
});

export type AppRouter = typeof appRouter;
