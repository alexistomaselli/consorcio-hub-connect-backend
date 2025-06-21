/*
  Warnings:

  - Added the required column `maxUnits` to the `plans` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "plans" ADD COLUMN     "maxUnits" INTEGER NOT NULL,
ADD COLUMN     "trialDays" INTEGER NOT NULL DEFAULT 0;
