/*
  Warnings:

  - The `tempData` column on the `email_verifications` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "email_verifications" DROP COLUMN "tempData",
ADD COLUMN     "tempData" JSONB;
