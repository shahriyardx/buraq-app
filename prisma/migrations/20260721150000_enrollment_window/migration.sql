-- AlterEnum
ALTER TYPE "EnrollmentStatus" ADD VALUE 'INCOMPLETE';

-- AlterTable
ALTER TABLE "enrollment" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "bonusWeeks" INTEGER NOT NULL DEFAULT 0;
