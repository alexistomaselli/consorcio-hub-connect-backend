/*
  Warnings:

  - You are about to drop the `_BuildingAdmins` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `adminId` to the `buildings` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "_BuildingAdmins" DROP CONSTRAINT "_BuildingAdmins_A_fkey";

-- DropForeignKey
ALTER TABLE "_BuildingAdmins" DROP CONSTRAINT "_BuildingAdmins_B_fkey";

-- AlterTable
ALTER TABLE "buildings" ADD COLUMN     "adminId" TEXT NOT NULL;

-- DropTable
DROP TABLE "_BuildingAdmins";

-- AddForeignKey
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
