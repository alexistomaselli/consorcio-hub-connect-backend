-- CreateEnum
CREATE TYPE "WhatsappStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'PENDING', 'FAILED');

-- CreateEnum
CREATE TYPE "N8nFlowStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "building_whatsapp" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "instanceId" TEXT,
    "instanceName" TEXT NOT NULL,
    "status" "WhatsappStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "n8nFlowStatus" "N8nFlowStatus" NOT NULL DEFAULT 'PENDING',
    "evolutionApiStatus" TEXT,
    "qrCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "building_whatsapp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "building_whatsapp_buildingId_key" ON "building_whatsapp"("buildingId");

-- CreateIndex
CREATE UNIQUE INDEX "building_whatsapp_instanceId_key" ON "building_whatsapp"("instanceId");

-- AddForeignKey
ALTER TABLE "building_whatsapp" ADD CONSTRAINT "building_whatsapp_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "buildings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
