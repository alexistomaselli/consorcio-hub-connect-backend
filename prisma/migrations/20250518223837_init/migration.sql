-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'BUILDING_ADMIN', 'OWNER', 'SERVICE_PROVIDER');

-- CreateEnum
CREATE TYPE "BuildingStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('FREE', 'BASIC', 'PRO');

-- CreateEnum
CREATE TYPE "WhatsappStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'PENDING', 'FAILED');

-- CreateEnum
CREATE TYPE "N8nFlowStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dni" TEXT,
    "role" "UserRole" NOT NULL,
    "primaryAuthMethod" TEXT NOT NULL DEFAULT 'EMAIL',
    "whatsappNumber" TEXT,
    "pin" TEXT,
    "recoveryEmail" TEXT,
    "securityQuestions" JSONB,
    "lastLoginAt" TIMESTAMP(3),
    "lastVerifiedAt" TIMESTAMP(3),
    "unitNumber" TEXT,
    "phoneNumber" TEXT,
    "profilePicture" TEXT,
    "isProfileComplete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verifications" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "userId" TEXT,
    "verificationCode" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "tempData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buildings" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "postalCode" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "logo" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "schema" TEXT NOT NULL,
    "status" "BuildingStatus" NOT NULL DEFAULT 'ACTIVE',
    "isProfileComplete" BOOLEAN NOT NULL DEFAULT false,
    "floors" INTEGER,
    "totalUnits" INTEGER,
    "constructionYear" INTEGER,
    "phoneNumber" TEXT,
    "whatsapp" TEXT,
    "website" TEXT,
    "description" TEXT,
    "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "adminId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "trialEndsAt" TIMESTAMP(3),

    CONSTRAINT "buildings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "type" "PlanType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "features" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_providers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "services" TEXT[],
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "floor" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "n8n_webhooks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "prodUrl" TEXT NOT NULL,
    "testUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "n8n_webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claims" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "serviceProviderId" TEXT,
    "comments" TEXT[],
    "images" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "building_owners" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "unitNumber" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "building_owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "owner_verifications" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "whatsappNumber" TEXT NOT NULL,
    "unitNumber" TEXT NOT NULL,
    "tempToken" TEXT NOT NULL,
    "verifyCode" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "owner_verifications_pkey" PRIMARY KEY ("id")
);

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
    "lastConnectionAttempt" TIMESTAMP(3),
    "connectionAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "qrExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "building_whatsapp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_BuildingToServiceProvider" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_BuildingToServiceProvider_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_dni_key" ON "users"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "users_whatsappNumber_key" ON "users"("whatsappNumber");

-- CreateIndex
CREATE UNIQUE INDEX "email_verifications_email_key" ON "email_verifications"("email");

-- CreateIndex
CREATE UNIQUE INDEX "buildings_email_key" ON "buildings"("email");

-- CreateIndex
CREATE UNIQUE INDEX "buildings_schema_key" ON "buildings"("schema");

-- CreateIndex
CREATE UNIQUE INDEX "plans_type_key" ON "plans"("type");

-- CreateIndex
CREATE UNIQUE INDEX "service_providers_userId_key" ON "service_providers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "n8n_webhooks_name_key" ON "n8n_webhooks"("name");

-- CreateIndex
CREATE UNIQUE INDEX "building_owners_buildingId_unitNumber_key" ON "building_owners"("buildingId", "unitNumber");

-- CreateIndex
CREATE UNIQUE INDEX "owner_verifications_tempToken_key" ON "owner_verifications"("tempToken");

-- CreateIndex
CREATE UNIQUE INDEX "building_whatsapp_buildingId_key" ON "building_whatsapp"("buildingId");

-- CreateIndex
CREATE UNIQUE INDEX "building_whatsapp_instanceId_key" ON "building_whatsapp"("instanceId");

-- CreateIndex
CREATE INDEX "_BuildingToServiceProvider_B_index" ON "_BuildingToServiceProvider"("B");

-- AddForeignKey
ALTER TABLE "email_verifications" ADD CONSTRAINT "email_verifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_providers" ADD CONSTRAINT "service_providers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "building_owners" ADD CONSTRAINT "building_owners_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "building_owners" ADD CONSTRAINT "building_owners_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "buildings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_verifications" ADD CONSTRAINT "owner_verifications_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "buildings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "building_whatsapp" ADD CONSTRAINT "building_whatsapp_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "buildings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BuildingToServiceProvider" ADD CONSTRAINT "_BuildingToServiceProvider_A_fkey" FOREIGN KEY ("A") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BuildingToServiceProvider" ADD CONSTRAINT "_BuildingToServiceProvider_B_fkey" FOREIGN KEY ("B") REFERENCES "service_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
