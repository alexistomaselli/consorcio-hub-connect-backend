/*
  Warnings:

  - You are about to drop the column `registrationData` on the `email_verifications` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "email_verifications" DROP COLUMN "registrationData",
ADD COLUMN     "tempData" TEXT;
