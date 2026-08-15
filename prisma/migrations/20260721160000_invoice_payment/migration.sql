-- AlterEnum
ALTER TYPE "InvoiceStatus" ADD VALUE 'PROCESSING';

-- AlterTable
ALTER TABLE "invoice" ADD COLUMN     "transactionId" TEXT;
