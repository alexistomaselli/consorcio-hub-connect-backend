-- Crear una función que será llamada por el trigger
CREATE OR REPLACE FUNCTION create_spaces_tables_for_schema() RETURNS event_trigger AS $$
DECLARE
    obj record;
    schema_name text;
BEGIN
    FOR obj IN SELECT * FROM pg_event_trigger_ddl_commands() WHERE command_tag = 'CREATE SCHEMA' LOOP
        -- Extraer el nombre del schema
        schema_name := obj.object_identity;
        
        -- Verificar si el schema comienza con "building_"
        IF schema_name LIKE 'building_%' THEN
            RAISE NOTICE 'Detected new building schema: %', schema_name;
            
            -- Crear tabla space_types
            EXECUTE format('
                CREATE TABLE IF NOT EXISTS %I.space_types (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    is_reservable BOOLEAN DEFAULT FALSE,
                    is_assignable BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            ', schema_name);
            
            -- Crear tabla spaces
            EXECUTE format('
                CREATE TABLE IF NOT EXISTS %I.spaces (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    name VARCHAR(255) NOT NULL,
                    space_type_id UUID NOT NULL REFERENCES %I.space_types(id),
                    floor VARCHAR(50),
                    description TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            ', schema_name, schema_name);
            
            -- Crear tabla space_owners
            EXECUTE format('
                CREATE TABLE IF NOT EXISTS %I.space_owners (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    space_id UUID NOT NULL REFERENCES %I.spaces(id) ON DELETE CASCADE,
                    owner_id UUID NOT NULL,
                    is_main BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            ', schema_name, schema_name);
            
            -- Modificar la tabla claims (si existe)
            EXECUTE format('
                DO $$
                BEGIN
                    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = %L AND table_name = ''claims'') THEN
                        ALTER TABLE %I.claims ADD COLUMN IF NOT EXISTS space_id UUID REFERENCES %I.spaces(id);
                    END IF;
                END $$;
            ', schema_name, schema_name, schema_name);
            
            -- Crear índices
            EXECUTE format('
                CREATE INDEX IF NOT EXISTS idx_spaces_space_type_id ON %I.spaces(space_type_id);
                CREATE INDEX IF NOT EXISTS idx_spaces_floor ON %I.spaces(floor);
                CREATE INDEX IF NOT EXISTS idx_space_owners_space_id ON %I.space_owners(space_id);
                CREATE INDEX IF NOT EXISTS idx_space_owners_owner_id ON %I.space_owners(owner_id);
            ', schema_name, schema_name, schema_name, schema_name);
            
            -- Si existe la tabla claims, crear el índice para space_id
            EXECUTE format('
                DO $$
                BEGIN
                    IF EXISTS (SELECT 1 FROM information_schema.tables 
                            WHERE table_schema = %L AND table_name = ''claims'') AND
                       EXISTS (SELECT 1 FROM information_schema.columns 
                            WHERE table_schema = %L AND table_name = ''claims'' AND column_name = ''space_id'') THEN
                        EXECUTE ''CREATE INDEX IF NOT EXISTS idx_claims_space_id ON '' || %L || ''.claims(space_id)'';
                    END IF;
                END $$;
            ', schema_name, schema_name, schema_name);
            
            RAISE NOTICE 'Created space tables for schema: %', schema_name;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger a nivel de evento en la base de datos
DROP EVENT TRIGGER IF EXISTS trigger_create_spaces_tables;
CREATE EVENT TRIGGER trigger_create_spaces_tables 
ON ddl_command_end
WHEN TAG IN ('CREATE SCHEMA')
EXECUTE FUNCTION create_spaces_tables_for_schema();

-- Mensaje de confirmación
SELECT 'Trigger para creación automática de tablas de espacios instalado exitosamente.' as mensaje;
