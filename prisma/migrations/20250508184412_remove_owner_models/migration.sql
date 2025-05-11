/*
  Warnings:

  - You are about to drop the `building_owners` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `owner_verifications` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "building_owners" DROP CONSTRAINT "building_owners_buildingId_fkey";

-- DropForeignKey
ALTER TABLE "building_owners" DROP CONSTRAINT "building_owners_userId_fkey";

-- DropForeignKey
ALTER TABLE "owner_verifications" DROP CONSTRAINT "owner_verifications_buildingId_fkey";

-- DropTable
DROP TABLE "building_owners";

-- DropTable
DROP TABLE "owner_verifications";
