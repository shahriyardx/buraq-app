-- Shared slots: a slot without a course is used by every non-private course.
ALTER TABLE "course_slot" ALTER COLUMN "courseId" DROP NOT NULL;
ALTER TABLE "course" ADD COLUMN     "privateSchedule" BOOLEAN NOT NULL DEFAULT false;

-- Each booking records the course it counts toward.
ALTER TABLE "slot_booking" ADD COLUMN     "courseId" TEXT;
UPDATE "slot_booking" b SET "courseId" = s."courseId" FROM "course_slot" s WHERE s."id" = b."slotId";
ALTER TABLE "slot_booking" ALTER COLUMN "courseId" SET NOT NULL;
CREATE INDEX "slot_booking_studentId_courseId_idx" ON "slot_booking"("studentId", "courseId");
ALTER TABLE "slot_booking" ADD CONSTRAINT "slot_booking_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Per-enrollment class count adjustment (compensation / migrated students).
ALTER TABLE "enrollment" ADD COLUMN     "classAdjust" INTEGER NOT NULL DEFAULT 0;
