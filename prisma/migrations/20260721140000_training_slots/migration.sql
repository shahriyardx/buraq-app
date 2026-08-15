-- AlterTable
ALTER TABLE "course" ADD COLUMN     "maxBookingsPerWeek" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "course_slot" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "course_slot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slot_booking" (
    "id" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "slot_booking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "course_slot_courseId_idx" ON "course_slot"("courseId");
CREATE INDEX "slot_booking_slotId_date_idx" ON "slot_booking"("slotId", "date");
CREATE INDEX "slot_booking_studentId_date_idx" ON "slot_booking"("studentId", "date");
CREATE UNIQUE INDEX "slot_booking_slotId_studentId_date_key" ON "slot_booking"("slotId", "studentId", "date");

-- AddForeignKey
ALTER TABLE "course_slot" ADD CONSTRAINT "course_slot_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "slot_booking" ADD CONSTRAINT "slot_booking_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "course_slot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "slot_booking" ADD CONSTRAINT "slot_booking_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
