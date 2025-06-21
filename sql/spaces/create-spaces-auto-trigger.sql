-- Este script crea un trigger a nivel de base de datos que se ejecutará
-- automáticamente cuando se cree un nuevo schema, independientemente del código TypeScript.

-- 1. Crear la función que se ejecutará cuando se cree un nuevo schema
CREATE OR REPLACE FUNCTION create_spaces_tables_on_schema_creation()
RETURNS event_trigger AS $$
DECLARE
    obj record;
    schema_name text;
BEGIN
    FOR obj IN SELECT * FROM pg_event_trigger_ddl_commands() WHERE command_tag = 'CREATE SCHEMA' LOOP
        -- Extraer el nombre del schema
        schema_name := obj.object_identity;
        
        -- Solo proceder si es un schema de building
        IF schema_name LIKE 'building_%' THEN
            RAISE NOTICE 'Creando tablas de espacios para el schema: %', schema_name;
            
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
            
            -- Crear un tipo de espacio predeterminado
            EXECUTE format('
                INSERT INTO %I.space_types (name, description, is_reservable, is_assignable)
                VALUES (''Espacio común'', ''Áreas comunes del edificio'', true, false)
                RETURNING id;
            ', schema_name) INTO obj;
            
            -- Crear tabla spaces
            EXECUTE format('
                CREATE TABLE IF NOT EXISTS %I.spaces (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    name VARCHAR(255) NOT NULL,
                    space_type_id UUID REFERENCES %I.space_types(id),
                    floor VARCHAR(50),
                    description TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            ', schema_name, schema_name);
            
            -- Crear un espacio predeterminado usando el tipo de espacio creado anteriormente
            EXECUTE format('
                INSERT INTO %I.spaces (name, space_type_id, floor, description)
                SELECT ''Hall de entrada'', id, ''PB'', ''Hall de entrada principal'' 
                FROM %I.space_types 
                ORDER BY created_at DESC LIMIT 1;
            ', schema_name, schema_name);
            
            -- Crear tabla space_owners
            EXECUTE format('
                CREATE TABLE IF NOT EXISTS %I.space_owners (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    space_id UUID REFERENCES %I.spaces(id) ON DELETE CASCADE,
                    owner_id UUID NOT NULL,
                    is_main BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            ', schema_name, schema_name);
            
            -- Verificar si la tabla claims ya existe y añadir la columna space_id si es necesario
            EXECUTE format('
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT FROM pg_tables 
                        WHERE schemaname = %L AND tablename = ''claims''
                    ) THEN
                        IF NOT EXISTS (
                            SELECT FROM information_schema.columns 
                            WHERE table_schema = %L AND table_name = ''claims'' AND column_name = ''space_id''
                        ) THEN
                            EXECUTE ''ALTER TABLE %I.claims ADD COLUMN space_id UUID REFERENCES %I.spaces(id);'';
                        END IF;
                    END IF;
                END $$;
            ', schema_name, schema_name, schema_name, schema_name);
            
            -- Crear índices
            EXECUTE format('
                CREATE INDEX IF NOT EXISTS idx_spaces_space_type_id ON %I.spaces(space_type_id);
                CREATE INDEX IF NOT EXISTS idx_space_owners_space_id ON %I.space_owners(space_id);
                CREATE INDEX IF NOT EXISTS idx_space_owners_owner_id ON %I.space_owners(owner_id);
            ', schema_name, schema_name, schema_name);
            
            -- Si la tabla claims existe, crear índice para space_id
            EXECUTE format('
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT FROM information_schema.columns 
                        WHERE table_schema = %L AND table_name = ''claims'' AND column_name = ''space_id''
                    ) THEN
                        EXECUTE ''CREATE INDEX IF NOT EXISTS idx_claims_space_id ON %I.claims(space_id);'';
                    END IF;
                END $$;
            ', schema_name, schema_name);
            
            RAISE NOTICE 'Tablas de espacios creadas correctamente para el schema: %', schema_name;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 2. Crear el trigger que ejecutará la función cuando se cree un nuevo schema
DROP EVENT TRIGGER IF EXISTS spaces_tables_creation_trigger;
CREATE EVENT TRIGGER spaces_tables_creation_trigger 
ON ddl_command_end
WHEN TAG IN ('CREATE SCHEMA')
EXECUTE FUNCTION create_spaces_tables_on_schema_creation();

-- 3. Verificar que el trigger se ha creado correctamente
SELECT pg_event_trigger_ddl_commands();

-- 4. Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE 'Trigger para la creación automática de tablas de espacios instalado correctamente';
END $$;
