-- Script para resetear la base de datos manteniendo plans, n8n_webhooks y service_types
-- ADVERTENCIA: Este script eliminará TODOS los datos excepto los especificados

-- Desactivar temporalmente las restricciones de clave foránea
SET session_replication_role = 'replica';

-- 1. Eliminar todos los schemas de building_*
DO $$
DECLARE
    schema_rec RECORD;
BEGIN
    FOR schema_rec IN SELECT schema_name 
                     FROM information_schema.schemata 
                     WHERE schema_name LIKE 'building_%'
    LOOP
        EXECUTE 'DROP SCHEMA IF EXISTS "' || schema_rec.schema_name || '" CASCADE';
    END LOOP;
END $$;

-- 2. Eliminar datos de tablas principales en esquema public, preservando tablas específicas

-- Eliminar building_whatsapp (dependiente de buildings)
TRUNCATE TABLE public.building_whatsapp CASCADE;

-- Eliminar building_owners (dependiente de buildings y users)
TRUNCATE TABLE public.building_owners CASCADE;

-- Eliminar owner_verifications (dependiente de buildings)
TRUNCATE TABLE public.owner_verifications CASCADE;

-- Eliminar email_verifications (dependiente de users)
TRUNCATE TABLE public.email_verifications CASCADE;

-- Eliminar provider_service_types (tabla relación)
TRUNCATE TABLE public.provider_service_types CASCADE;

-- Eliminar service_providers 
TRUNCATE TABLE public.service_providers CASCADE;

-- Eliminar buildings (depende de users)
TRUNCATE TABLE public.buildings CASCADE;

-- Eliminar usuarios excepto SUPER_ADMIN
DELETE FROM public.users WHERE role != 'SUPER_ADMIN';

-- Activar nuevamente las restricciones de clave foránea
SET session_replication_role = 'origin';

-- Mensaje de confirmación
SELECT 'Base de datos reseteada exitosamente. Se han mantenido las tablas plans, n8n_webhooks y service_types.' as mensaje;
