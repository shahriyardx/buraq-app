/**
 * Normalizes a `yyyy-mm-dd` string to a midnight-UTC `Date`, matching the
 * `@db.Date` column on `Attendance` and the `studentId_courseId_date` key.
 */
export function toAttendanceDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}
