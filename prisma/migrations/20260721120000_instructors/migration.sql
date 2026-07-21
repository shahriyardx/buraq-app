-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'INSTRUCTOR';

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "instructorId" TEXT,
ADD COLUMN     "specialties" TEXT;

-- AlterTable
ALTER TABLE "course" ADD COLUMN     "instructorUserId" TEXT;

-- AlterTable
ALTER TABLE "class_session" ADD COLUMN     "instructorUserId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "user_instructorId_key" ON "user"("instructorId");

-- CreateIndex
CREATE INDEX "course_instructorUserId_idx" ON "course"("instructorUserId");

-- CreateIndex
CREATE INDEX "class_session_instructorUserId_idx" ON "class_session"("instructorUserId");

-- AddForeignKey
ALTER TABLE "course" ADD CONSTRAINT "course_instructorUserId_fkey" FOREIGN KEY ("instructorUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_session" ADD CONSTRAINT "class_session_instructorUserId_fkey" FOREIGN KEY ("instructorUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
