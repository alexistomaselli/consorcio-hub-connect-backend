-- Script para crear manualmente las tablas de espacios
-- Reemplaza el schema "building_85a4bd7b_57b7_40fb_a25d_0335fae77df2" si es necesario

-- 1. Crear tabla space_types
CREATE TABLE IF NOT EXISTS "building_85a4bd7b_57b7_40fb_a25d_0335fae77df2"."space_types" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "is_reservable" BOOLEAN DEFAULT FALSE,
  "is_assignable" BOOLEAN DEFAULT FALSE,
  "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Insertar tipo predeterminado
INSERT INTO "building_85a4bd7b_57b7_40fb_a25d_0335fae77df2"."space_types" ("name", "description", "is_reservable")
VALUES ('Espacio común', 'Áreas comunes del edificio', TRUE);

-- 3. Crear tabla spaces
CREATE TABLE IF NOT EXISTS "building_85a4bd7b_57b7_40fb_a25d_0335fae77df2"."spaces" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(255) NOT NULL,
  "space_type_id" UUID NOT NULL,
  "floor" VARCHAR(50),
  "description" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "spaces_space_type_id_fkey" 
  FOREIGN KEY ("space_type_id") REFERENCES "building_85a4bd7b_57b7_40fb_a25d_0335fae77df2"."space_types"("id")
);

-- 4. Crear tabla space_owners
CREATE TABLE IF NOT EXISTS "building_85a4bd7b_57b7_40fb_a25d_0335fae77df2"."space_owners" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "space_id" UUID NOT NULL,
  "owner_id" UUID NOT NULL,
  "is_main" BOOLEAN DEFAULT FALSE,
  "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "space_owners_space_id_fkey" 
  FOREIGN KEY ("space_id") REFERENCES "building_85a4bd7b_57b7_40fb_a25d_0335fae77df2"."spaces"("id") ON DELETE CASCADE
);

-- 5. Modificar tabla claims para añadir referencia a spaces (si existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_catalog.pg_tables 
    WHERE schemaname = 'building_85a4bd7b_57b7_40fb_a25d_0335fae77df2' AND tablename = 'claims'
  ) THEN
    ALTER TABLE "building_85a4bd7b_57b7_40fb_a25d_0335fae77df2"."claims"
    ADD COLUMN IF NOT EXISTS "space_id" UUID,
    ADD CONSTRAINT "claims_space_id_fkey" 
    FOREIGN KEY ("space_id") REFERENCES "building_85a4bd7b_57b7_40fb_a25d_0335fae77df2"."spaces"("id") ON DELETE SET NULL;
  END IF;
END $$;

-- 6. Crear índices
CREATE INDEX IF NOT EXISTS "idx_spaces_space_type_id" ON "building_85a4bd7b_57b7_40fb_a25d_0335fae77df2"."spaces"("space_type_id");
CREATE INDEX IF NOT EXISTS "idx_space_owners_space_id" ON "building_85a4bd7b_57b7_40fb_a25d_0335fae77df2"."space_owners"("space_id");
CREATE INDEX IF NOT EXISTS "idx_space_owners_owner_id" ON "building_85a4bd7b_57b7_40fb_a25d_0335fae77df2"."space_owners"("owner_id");

-- 7. Crear un espacio predeterminado
INSERT INTO "building_85a4bd7b_57b7_40fb_a25d_0335fae77df2"."spaces" ("name", "space_type_id", "floor", "description")
SELECT 'Hall de entrada', id, 'PB', 'Hall de entrada principal'
FROM "building_85a4bd7b_57b7_40fb_a25d_0335fae77df2"."space_types" 
WHERE name = 'Espacio común' 
LIMIT 1;
