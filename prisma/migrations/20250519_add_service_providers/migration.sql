-- CreateTable
CREATE TABLE "service_providers" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "business_name" VARCHAR(255) NOT NULL,
    "tax_id" VARCHAR(50),
    "description" TEXT,
    "services" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "country" VARCHAR(100),
    "website" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "service_provider_contacts" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "provider_id" UUID NOT NULL,
    "contact_name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(255),
    "whatsapp" VARCHAR(255),
    "is_primary" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "service_provider_contacts_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "service_providers"("id") ON DELETE CASCADE
);

-- CreateTable
CREATE TABLE "service_provider_addresses" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "provider_id" UUID NOT NULL,
    "address" TEXT NOT NULL,
    "postal_code" VARCHAR(20),
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "is_primary" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "service_provider_addresses_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "service_providers"("id") ON DELETE CASCADE
);

-- CreateIndex
CREATE INDEX "service_providers_city_idx" ON "service_providers"("city");
CREATE INDEX "service_providers_state_idx" ON "service_providers"("state");
CREATE INDEX "service_provider_contacts_provider_id_idx" ON "service_provider_contacts"("provider_id");
CREATE INDEX "service_provider_addresses_provider_id_idx" ON "service_provider_addresses"("provider_id");
CREATE INDEX "service_provider_addresses_city_idx" ON "service_provider_addresses"("city");
CREATE INDEX "service_provider_addresses_state_idx" ON "service_provider_addresses"("state");
