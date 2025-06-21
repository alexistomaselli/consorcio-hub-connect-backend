-- Script para crear manualmente las tablas de reclamos
-- Reemplaza el schema "building_XXXXX" si es necesario con el ID del edificio correspondiente

-- 1. Crear tabla claims
CREATE TABLE IF NOT EXISTS "building_XXXXX"."claims" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT NOT NULL,
  "status" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  "location" VARCHAR(50) NOT NULL,
  "unit_id" UUID,
  "space_id" UUID,
  "location_detail" TEXT,
  "priority" VARCHAR(50) DEFAULT 'NORMAL',
  "creator_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "claims_space_id_fkey" 
    FOREIGN KEY ("space_id") REFERENCES "building_XXXXX"."spaces"("id") ON DELETE SET NULL
);

-- 2. Crear tabla claim_comments
CREATE TABLE IF NOT EXISTS "building_XXXXX"."claim_comments" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "content" TEXT NOT NULL,
  "claim_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "claim_comments_claim_id_fkey" 
    FOREIGN KEY ("claim_id") REFERENCES "building_XXXXX"."claims"("id") ON DELETE CASCADE
);

-- 3. Crear tabla claim_images (para las imágenes)
CREATE TABLE IF NOT EXISTS "building_XXXXX"."claim_images" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "claim_id" UUID NOT NULL,
  "url" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "claim_images_claim_id_fkey" 
    FOREIGN KEY ("claim_id") REFERENCES "building_XXXXX"."claims"("id") ON DELETE CASCADE
);

-- 4. Crear índices
CREATE INDEX IF NOT EXISTS "idx_claims_status" ON "building_XXXXX"."claims"("status");
CREATE INDEX IF NOT EXISTS "idx_claims_creator_id" ON "building_XXXXX"."claims"("creator_id");
CREATE INDEX IF NOT EXISTS "idx_claims_space_id" ON "building_XXXXX"."claims"("space_id");
CREATE INDEX IF NOT EXISTS "idx_claim_comments_claim_id" ON "building_XXXXX"."claim_comments"("claim_id");
CREATE INDEX IF NOT EXISTS "idx_claim_images_claim_id" ON "building_XXXXX"."claim_images"("claim_id");
