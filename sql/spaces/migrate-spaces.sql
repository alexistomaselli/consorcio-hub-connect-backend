-- Script de migración para agregar tablas de espacios a esquemas de building existentes
-- Reemplaza 'building_75e170d0_5a7c_4ce4_b028_0c1a61592cb2' con el nombre del schema que quieres actualizar

-- Crear tabla space_types (tipos de espacios)
CREATE TABLE IF NOT EXISTS "building_75e170d0_5a7c_4ce4_b028_0c1a61592cb2".space_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_reservable BOOLEAN DEFAULT FALSE,
  is_assignable BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla spaces (espacios)
CREATE TABLE IF NOT EXISTS "building_75e170d0_5a7c_4ce4_b028_0c1a61592cb2".spaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  space_type_id UUID NOT NULL REFERENCES "building_75e170d0_5a7c_4ce4_b028_0c1a61592cb2".space_types(id),
  floor VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla space_owners (relación entre espacios y propietarios)
CREATE TABLE IF NOT EXISTS "building_75e170d0_5a7c_4ce4_b028_0c1a61592cb2".space_owners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  space_id UUID NOT NULL REFERENCES "building_75e170d0_5a7c_4ce4_b028_0c1a61592cb2".spaces(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  is_main BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Modificar la tabla claims para referenciar spaces en lugar de units
ALTER TABLE IF EXISTS "building_75e170d0_5a7c_4ce4_b028_0c1a61592cb2".claims 
ADD COLUMN IF NOT EXISTS space_id UUID REFERENCES "building_75e170d0_5a7c_4ce4_b028_0c1a61592cb2".spaces(id);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_spaces_space_type_id ON "building_75e170d0_5a7c_4ce4_b028_0c1a61592cb2".spaces(space_type_id);
CREATE INDEX IF NOT EXISTS idx_spaces_floor ON "building_75e170d0_5a7c_4ce4_b028_0c1a61592cb2".spaces(floor);
CREATE INDEX IF NOT EXISTS idx_space_owners_space_id ON "building_75e170d0_5a7c_4ce4_b028_0c1a61592cb2".space_owners(space_id);
CREATE INDEX IF NOT EXISTS idx_space_owners_owner_id ON "building_75e170d0_5a7c_4ce4_b028_0c1a61592cb2".space_owners(owner_id);
CREATE INDEX IF NOT EXISTS idx_claims_space_id ON "building_75e170d0_5a7c_4ce4_b028_0c1a61592cb2".claims(space_id);
