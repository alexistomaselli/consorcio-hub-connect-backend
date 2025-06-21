-- Verificar las tablas existentes
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Buscar el usuario
SELECT * FROM "User" WHERE email = 'sebastianvettel01@gmail.com';

-- Verificar si existe la tabla BuildingWhatsApp
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'BuildingWhatsApp'
);
