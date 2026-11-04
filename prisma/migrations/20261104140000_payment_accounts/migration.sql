CREATE TABLE "payment_account" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "accountType" TEXT,
    "accountName" TEXT,
    "number" TEXT NOT NULL,
    "qrUrl" TEXT,
    "instructions" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_account_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "invoice" ADD COLUMN     "paidVia" TEXT,
ADD COLUMN     "payerNumber" TEXT;
