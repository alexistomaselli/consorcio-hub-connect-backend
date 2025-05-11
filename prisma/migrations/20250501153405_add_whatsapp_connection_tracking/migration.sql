-- AlterTable
ALTER TABLE "building_whatsapp" ADD COLUMN     "connectionAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastConnectionAttempt" TIMESTAMP(3),
ADD COLUMN     "lastError" TEXT,
ADD COLUMN     "qrExpiresAt" TIMESTAMP(3);
