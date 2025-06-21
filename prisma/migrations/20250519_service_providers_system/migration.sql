-- Drop existing tables and constraints
DROP TABLE IF EXISTS "service_history";
DROP TABLE IF EXISTS "provider_service_types";
DROP TABLE IF EXISTS "_BuildingToServiceProvider";
DROP TABLE IF EXISTS "service_providers";
DROP TABLE IF EXISTS "service_types";
DROP TYPE IF EXISTS "ServiceProviderStatus";

DO $$ BEGIN
    -- Create ServiceProviderStatus enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'serviceproviderStatus') THEN
        CREATE TYPE "ServiceProviderStatus" AS ENUM ('UNVERIFIED', 'VERIFIED', 'FEATURED', 'SUSPENDED');
    END IF;
END $$;

-- CreateTable (only if not exists)
CREATE TABLE IF NOT EXISTS "service_types" (
    "id" text NOT NULL DEFAULT gen_random_uuid()::text,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "icon" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable (only if not exists)
CREATE TABLE IF NOT EXISTS "service_providers" (
    "id" text NOT NULL DEFAULT gen_random_uuid()::text,
    "business_name" VARCHAR(255) NOT NULL,
    "tax_id" VARCHAR(50),
    "description" TEXT,
    "contact_name" VARCHAR(255),
    "email" VARCHAR(255),
    "phone" VARCHAR(255),
    "whatsapp" VARCHAR(255),
    "website" VARCHAR(255),
    "address" TEXT,
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "postal_code" VARCHAR(20),
    "status" "ServiceProviderStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "registration_type" VARCHAR(20) NOT NULL,
    "registered_by_id" text NOT NULL,
    "registered_by_type" VARCHAR(20) NOT NULL,
    "verified_by_id" text,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable (only if not exists)
CREATE TABLE IF NOT EXISTS "provider_service_types" (
    "provider_id" text NOT NULL,
    "service_type_id" text NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_service_types_pkey" PRIMARY KEY ("provider_id", "service_type_id")
);

-- CreateTable (only if not exists)
CREATE TABLE IF NOT EXISTS "service_history" (
    "id" text NOT NULL DEFAULT gen_random_uuid()::text,
    "provider_id" text NOT NULL,
    "building_id" text NOT NULL,
    "service_type_id" text NOT NULL,
    "rating" INTEGER,
    "review" TEXT,
    "work_date" TIMESTAMP(3) NOT NULL,
    "cost_range" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_history_pkey" PRIMARY KEY ("id")
);

-- Add foreign keys (only if they don't exist)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'provider_service_types_provider_id_fkey') THEN
        ALTER TABLE "provider_service_types" ADD CONSTRAINT "provider_service_types_provider_id_fkey" 
        FOREIGN KEY ("provider_id") REFERENCES "service_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'provider_service_types_service_type_id_fkey') THEN
        ALTER TABLE "provider_service_types" ADD CONSTRAINT "provider_service_types_service_type_id_fkey" 
        FOREIGN KEY ("service_type_id") REFERENCES "service_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'service_history_provider_id_fkey') THEN
        ALTER TABLE "service_history" ADD CONSTRAINT "service_history_provider_id_fkey" 
        FOREIGN KEY ("provider_id") REFERENCES "service_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'service_history_building_id_fkey') THEN
        ALTER TABLE "service_history" ADD CONSTRAINT "service_history_building_id_fkey" 
        FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'service_history_service_type_id_fkey') THEN
        ALTER TABLE "service_history" ADD CONSTRAINT "service_history_service_type_id_fkey" 
        FOREIGN KEY ("service_type_id") REFERENCES "service_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Create indexes (only if they don't exist)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'service_providers_city_idx') THEN
        CREATE INDEX "service_providers_city_idx" ON "service_providers"("city");
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'service_providers_state_idx') THEN
        CREATE INDEX "service_providers_state_idx" ON "service_providers"("state");
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'service_providers_status_idx') THEN
        CREATE INDEX "service_providers_status_idx" ON "service_providers"("status");
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'service_history_provider_id_idx') THEN
        CREATE INDEX "service_history_provider_id_idx" ON "service_history"("provider_id");
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'service_history_building_id_idx') THEN
        CREATE INDEX "service_history_building_id_idx" ON "service_history"("building_id");
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'service_history_service_type_id_idx') THEN
        CREATE INDEX "service_history_service_type_id_idx" ON "service_history"("service_type_id");
    END IF;
END $$;

-- Add check constraint for rating (only if it doesn't exist)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'service_history_rating_check') THEN
        ALTER TABLE "service_history" ADD CONSTRAINT "service_history_rating_check" CHECK (rating BETWEEN 1 AND 5);
    END IF;
END $$;
