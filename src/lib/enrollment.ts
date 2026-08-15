import "server-only";
import { prisma } from "@/lib/prisma";

// ─── Week / date helpers (all UTC, Monday-start weeks) ──────────────────────

export function dateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function toUtcDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export function weekStartKey(d: Date) {
  const day = d.getUTCDay(); // 0=Sun … 6=Sat
  const back = (day + 6) % 7; // days since Monday
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - back);
  return dateKey(monday);
}

export function todayUtc() {
  return toUtcDate(new Date().toISOString().slice(0, 10));
}

export function addWeeksKey(weekKey: string, n: number) {
  const d = toUtcDate(weekKey);
  d.setUTCDate(d.getUTCDate() + n * 7);
  return dateKey(d);
}

/** "HH:mm" → minutes since midnight. */
export function hmToMin(hm: string) {
  const [h, m] = hm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** minutes since midnight → "HH:mm". */
export function minToHm(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Splits a [start,end] window into fixed-length sub-sessions. */
export function subSessions(start: string, end: string, minutes: number) {
  const s = hmToMin(start);
  const e = hmToMin(end);
  const len = minutes > 0 ? minutes : 30;
  const out: { start: string; end: string }[] = [];
  for (let t = s; t + len <= e; t += len) {
    out.push({ start: minToHm(t), end: minToHm(t + len) });
  }
  return out;
}

// ─── Progress model ─────────────────────────────────────────────────────────

export type EnrollmentLite = {
  id: string;
  studentId: string;
  courseId: string;
  status: string;
  approvedAt: Date | null;
  startDate: Date | null;
  createdAt: Date;
  bonusWeeks: number;
  course: { durationWeeks: number | null };
};

export type EnrollmentProgress = {
  requiredWeeks: number; // 0 = open-ended (no duration set)
  completedWeeks: number; // distinct weeks with ≥1 booking
  bonusWeeks: number;
  anchorWeek: string;
  lastAllowedWeek: string | null; // Monday key of the final bookable week
  allowedUntil: string | null; // last bookable calendar date (Sunday of lastAllowedWeek)
  currentWeek: string;
  bookingOpen: boolean;
  derivedStatus: string;
};

/**
 * Derives an enrollment's booking window and completion state.
 * - Student must book ≥1 slot in `requiredWeeks` distinct weeks to COMPLETE.
 * - The window spans `durationWeeks + bonusWeeks` calendar weeks from approval.
 * - When the window elapses without enough booked weeks → INCOMPLETE (closed).
 */
export function computeProgress(
  e: EnrollmentLite,
  bookedWeekKeys: Set<string>,
): EnrollmentProgress {
  const anchor = e.approvedAt ?? e.startDate ?? e.createdAt;
  const anchorWeek = weekStartKey(anchor);
  const required = e.course.durationWeeks ?? 0;
  const currentWeek = weekStartKey(todayUtc());
  const completedWeeks = bookedWeekKeys.size;

  let lastAllowedWeek: string | null = null;
  let allowedUntil: string | null = null;
  if (required > 0) {
    const windowWeeks = required + e.bonusWeeks;
    lastAllowedWeek = addWeeksKey(anchorWeek, windowWeeks - 1);
    allowedUntil = addWeeksKey(lastAllowedWeek, 0);
    // Sunday of that week = Monday + 6 days.
    const sunday = toUtcDate(lastAllowedWeek);
    sunday.setUTCDate(sunday.getUTCDate() + 6);
    allowedUntil = dateKey(sunday);
  }

  const elapsed = lastAllowedWeek !== null && currentWeek > lastAllowedWeek;

  let derivedStatus = e.status;
  if (e.status === "ACTIVE" || e.status === "INCOMPLETE") {
    if (required > 0 && completedWeeks >= required) derivedStatus = "COMPLETED";
    else if (elapsed) derivedStatus = "INCOMPLETE";
    else derivedStatus = "ACTIVE";
  }

  const bookingOpen =
    derivedStatus === "ACTIVE" &&
    (lastAllowedWeek === null || currentWeek <= lastAllowedWeek);

  return {
    requiredWeeks: required,
    completedWeeks,
    bonusWeeks: e.bonusWeeks,
    anchorWeek,
    lastAllowedWeek,
    allowedUntil,
    currentWeek,
    bookingOpen,
    derivedStatus,
  };
}

/** Distinct Monday-week keys in which the student booked a slot for a course. */
export async function loadBookedWeekKeys(studentId: string, courseId: string) {
  const bookings = await prisma.slotBooking.findMany({
    where: { studentId, slot: { courseId } },
    select: { date: true },
  });
  return new Set(bookings.map((b) => weekStartKey(b.date)));
}

/**
 * Recomputes an enrollment's status and persists ACTIVE↔COMPLETED/INCOMPLETE
 * transitions. Returns the derived progress.
 */
export async function refreshEnrollment(e: EnrollmentLite) {
  const booked = await loadBookedWeekKeys(e.studentId, e.courseId);
  const progress = computeProgress(e, booked);
  if (progress.derivedStatus !== e.status) {
    await prisma.enrollment.update({
      where: { id: e.id },
      data: { status: progress.derivedStatus as never },
    });
  }
  return progress;
}
