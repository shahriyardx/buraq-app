-- AlterTable
ALTER TABLE "course_slot" ADD COLUMN     "sessionMinutes" INTEGER NOT NULL DEFAULT 30;

-- AlterTable
ALTER TABLE "slot_booking" ADD COLUMN     "startTime" TEXT NOT NULL DEFAULT '';
