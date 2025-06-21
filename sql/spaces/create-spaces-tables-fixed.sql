-- Script para crear directamente las tablas de espacios en un esquema específico
-- Usando el nombre correcto del esquema: building_94d906c5_fa1a_45d6_b93e_be0ddc6a7a12

-- Crear extensión uuid-ossp si no existe
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crear tabla space_types
CREATE TABLE IF NOT EXISTS "building_94d906c5_fa1a_45d6_b93e_be0ddc6a7a12".space_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_reservable BOOLEAN DEFAULT FALSE,
  is_assignable BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla spaces
CREATE TABLE IF NOT EXISTS "building_94d906c5_fa1a_45d6_b93e_be0ddc6a7a12".spaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  space_type_id UUID REFERENCES "building_94d906c5_fa1a_45d6_b93e_be0ddc6a7a12".space_types(id),
  floor VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla space_owners
CREATE TABLE IF NOT EXISTS "building_94d906c5_fa1a_45d6_b93e_be0ddc6a7a12".space_owners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  space_id UUID REFERENCES "building_94d906c5_fa1a_45d6_b93e_be0ddc6a7a12".spaces(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  is_main BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Modificar tabla claims para añadir space_id
ALTER TABLE "building_94d906c5_fa1a_45d6_b93e_be0ddc6a7a12".claims
ADD COLUMN IF NOT EXISTS space_id UUID REFERENCES "building_94d906c5_fa1a_45d6_b93e_be0ddc6a7a12".spaces(id);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_spaces_space_type_id ON "building_94d906c5_fa1a_45d6_b93e_be0ddc6a7a12".spaces(space_type_id);
CREATE INDEX IF NOT EXISTS idx_space_owners_space_id ON "building_94d906c5_fa1a_45d6_b93e_be0ddc6a7a12".space_owners(space_id);
CREATE INDEX IF NOT EXISTS idx_space_owners_owner_id ON "building_94d906c5_fa1a_45d6_b93e_be0ddc6a7a12".space_owners(owner_id);
CREATE INDEX IF NOT EXISTS idx_claims_space_id ON "building_94d906c5_fa1a_45d6_b93e_be0ddc6a7a12".claims(space_id);

-- Insertar un tipo de espacio predeterminado
INSERT INTO "building_94d906c5_fa1a_45d6_b93e_be0ddc6a7a12".space_types (name, description, is_reservable, is_assignable)
VALUES ('Espacio común', 'Áreas comunes del edificio', true, false);

-- Obtener el ID del tipo de espacio e insertar un espacio predeterminado
DO $$
DECLARE
    space_type_id UUID;
BEGIN
    SELECT id INTO space_type_id FROM "building_94d906c5_fa1a_45d6_b93e_be0ddc6a7a12".space_types LIMIT 1;
    
    IF space_type_id IS NOT NULL THEN
        INSERT INTO "building_94d906c5_fa1a_45d6_b93e_be0ddc6a7a12".spaces (name, space_type_id, floor, description)
        VALUES ('Hall de entrada', space_type_id, 'PB', 'Hall de entrada principal');
    END IF;
END $$;
