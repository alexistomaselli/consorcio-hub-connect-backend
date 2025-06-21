-- Primero crear la extensión UUID si no existe
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crear tabla space_types (tipos de espacios)
CREATE TABLE IF NOT EXISTS "building_44c99379_b5e5_4513_9ffa_22ce981a175c".space_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_reservable BOOLEAN DEFAULT FALSE,
  is_assignable BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla spaces (espacios)
CREATE TABLE IF NOT EXISTS "building_44c99379_b5e5_4513_9ffa_22ce981a175c".spaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  space_type_id UUID NOT NULL REFERENCES "building_44c99379_b5e5_4513_9ffa_22ce981a175c".space_types(id),
  floor VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla space_owners (relación entre espacios y propietarios)
CREATE TABLE IF NOT EXISTS "building_44c99379_b5e5_4513_9ffa_22ce981a175c".space_owners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  space_id UUID NOT NULL REFERENCES "building_44c99379_b5e5_4513_9ffa_22ce981a175c".spaces(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  is_main BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Modificar la tabla claims para referenciar spaces
ALTER TABLE IF EXISTS "building_44c99379_b5e5_4513_9ffa_22ce981a175c".claims
ADD COLUMN IF NOT EXISTS space_id UUID REFERENCES "building_44c99379_b5e5_4513_9ffa_22ce981a175c".spaces(id);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_spaces_space_type_id ON "building_44c99379_b5e5_4513_9ffa_22ce981a175c".spaces(space_type_id);
CREATE INDEX IF NOT EXISTS idx_spaces_floor ON "building_44c99379_b5e5_4513_9ffa_22ce981a175c".spaces(floor);
CREATE INDEX IF NOT EXISTS idx_space_owners_space_id ON "building_44c99379_b5e5_4513_9ffa_22ce981a175c".space_owners(space_id);
CREATE INDEX IF NOT EXISTS idx_space_owners_owner_id ON "building_44c99379_b5e5_4513_9ffa_22ce981a175c".space_owners(owner_id);
CREATE INDEX IF NOT EXISTS idx_claims_space_id ON "building_44c99379_b5e5_4513_9ffa_22ce981a175c".claims(space_id);
