/*
  Warnings:

  - A unique constraint covering the columns `[dni]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `dni` to the `owner_verifications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `firstName` to the `owner_verifications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `owner_verifications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unitNumber` to the `owner_verifications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `owner_verifications` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "owner_verifications" ADD COLUMN     "dni" TEXT NOT NULL,
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "lastName" TEXT NOT NULL,
ADD COLUMN     "unitNumber" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "dni" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_dni_key" ON "users"("dni");
