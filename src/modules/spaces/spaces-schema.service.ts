import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SpacesSchemaService {
  constructor(private prisma: PrismaService) {}

  /**
   * Verifica y crea las tablas necesarias para el módulo de espacios en un edificio
   */
  async ensureSpaceTablesExist(buildingId: string): Promise<boolean> {
    try {
      console.log(`🔍 [SpacesSchemaService] Verificando tablas para building: ${buildingId}`);
      
      // 1. Obtener el schema del building
      const building = await this.prisma.building.findUnique({
        where: { id: buildingId },
        select: { schema: true }
      });
      
      console.log(`📊 [SpacesSchemaService] Resultado de búsqueda del building:`, building);
      
      if (!building) {
        console.error(`❌ [SpacesSchemaService] Building con ID ${buildingId} no encontrado`);
        throw new Error(`Building con ID ${buildingId} no encontrado`);
      }
      
      const schema = building.schema;
      console.log(`🗂️ [SpacesSchemaService] Schema del building: ${schema}`);
      
      // 2. Verificar si las tablas ya existen
      const tablesExist = await this.checkSpaceTablesExist(schema);
      
      if (tablesExist) {
        console.log(`✅ [SpacesSchemaService] Las tablas de espacios ya existen en el schema "${schema}"`);
        return true;
      }
      
      // 3. Crear las tablas usando transacciones de Prisma
      await this.createSpaceTables(schema);
      
      // 4. Verificar que las tablas se crearon correctamente
      const verificationResult = await this.checkSpaceTablesExist(schema);
      
      if (!verificationResult) {
        throw new Error(`No se pudieron crear las tablas de espacios en el schema "${schema}"`);
      }
      
      console.log(`✅ [SpacesSchemaService] Tablas de espacios creadas exitosamente en "${schema}"`);
      return true;
    } catch (error) {
      console.error(`❌ [SpacesSchemaService] Error:`, error);
      throw new Error(`Error al crear tablas de espacios: ${error.message}`);
    }
  }

  /**
   * Verifica si las tablas de espacios ya existen en el schema dado
   * Usa una combinación de métodos para asegurar que la verificación sea robusta
   */
  async checkSpaceTablesExist(schema: string): Promise<boolean> {
    try {
      console.log(`🔍 [SpacesSchemaService] Verificando existencia de tablas en schema: ${schema}`);
      
      // Método 1: Verificar si podemos contar registros en las tablas
      try {
        // Intentamos hacer una consulta COUNT a la tabla space_types
        // Si la tabla no existe, esto lanzará una excepción
        const spaceTypesCount = await this.prisma.$queryRawUnsafe<[{count: number}]>(`
          SELECT COUNT(*) as count FROM "${schema}".space_types;
        `);
        
        console.log(`📊 [SpacesSchemaService] Conteo de space_types:`, spaceTypesCount);
        
        // Si llegamos aquí, la tabla existe
        return true;
      } catch (queryError) {
        console.log(`⚠️ [SpacesSchemaService] Error al consultar space_types:`, queryError.message);
        
        // Si el error es porque la tabla no existe, intentamos el siguiente método
        if (queryError.message.includes('does not exist') || queryError.code === 'P2021') {
          console.log(`⚠️ [SpacesSchemaService] La tabla space_types no existe según el método 1`);
        } else {
          // Si es otro tipo de error, lo propagamos
          throw queryError;
        }
      }
      
      // Método 2: Verificar usando pg_catalog (más confiable pero más bajo nivel)
      const requiredTables = ['space_types', 'spaces', 'space_owners'];
      let allTablesExist = true;
      
      for (const table of requiredTables) {
        console.log(`👀 [SpacesSchemaService] Verificando tabla: ${table} usando pg_catalog`);
        const tableExistsQuery = await this.prisma.$queryRawUnsafe(`
          SELECT EXISTS (
            SELECT FROM pg_catalog.pg_tables 
            WHERE schemaname = '${schema}' AND tablename = '${table}'
          ) as "exists";
        `) as any[];
        
        // Extraer el valor booleano de la respuesta
        const exists = tableExistsQuery[0] && 
                      (tableExistsQuery[0].exists === true || 
                       tableExistsQuery[0].exists === 't' || 
                       tableExistsQuery[0].exists === 'true');
        
        console.log(`📊 [SpacesSchemaService] Resultado para ${table} (método 2):`, tableExistsQuery, 'interpretado como:', exists);
        
        if (!exists) {
          console.log(`⚠️ [SpacesSchemaService] La tabla ${table} no existe según el método 2`);
          allTablesExist = false;
          break;
        }
      }
      
      if (allTablesExist) {
        console.log(`✅ [SpacesSchemaService] Todas las tablas existen según el método 2`);
        return true;
      }
      
      // Si llegamos aquí, las tablas no existen
      return false;
    } catch (error) {
      console.error(`❌ [SpacesSchemaService] Error verificando tablas:`, error);
      return false;
    }
  }

  /**
   * Crea todas las tablas necesarias para el módulo de espacios
   */
  private async createSpaceTables(schema: string): Promise<void> {
    console.log(`🚀 [SpacesSchemaService] Creando tablas de espacios en "${schema}"...`);
    
    // Verificar si el schema existe primero
    try {
      console.log(`🔍 [SpacesSchemaService] Verificando existencia del schema ${schema}`);
      const schemaExists = await this.prisma.$queryRawUnsafe<any[]>(`
        SELECT EXISTS (
          SELECT FROM pg_namespace WHERE nspname = '${schema}'
        ) as exists;
      `);
      
      console.log(`📊 [SpacesSchemaService] ¿El schema ${schema} existe?:`, JSON.stringify(schemaExists));
      
      if (!schemaExists || !schemaExists[0] || schemaExists[0].exists === false || schemaExists[0].exists === 'f') {
        console.log(`⚠️ [SpacesSchemaService] El schema ${schema} no existe. Intentando crearlo...`);
        
        // Crear el schema si no existe
        await this.prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schema}";`);
        
        console.log(`✅ [SpacesSchemaService] Schema ${schema} creado exitosamente`);
      }
    } catch (error) {
      console.error(`❌ [SpacesSchemaService] Error verificando/creando el schema:`, error);
      throw new Error(`Error al verificar/crear el schema: ${error.message}`);
    }
    
    // Usar transacciones de Prisma para asegurar atomicidad
    try {
      await this.prisma.$transaction(async (tx) => {
        console.log(`💾 [SpacesSchemaService] Iniciando transacción para crear tablas en schema: ${schema}`);
        
        // 1. Crear tabla space_types
        await tx.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "${schema}"."space_types" (
            "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "name" VARCHAR(255) NOT NULL,
            "description" TEXT,
            "is_reservable" BOOLEAN DEFAULT FALSE,
            "is_assignable" BOOLEAN DEFAULT FALSE,
            "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
          );
        `);
        console.log(`✓ Tabla space_types creada`);
        
        try {
          // 2. Insertar tipo predeterminado
          const spaceTypeResult = await tx.$executeRawUnsafe(`
            INSERT INTO "${schema}"."space_types" ("name", "description", "is_reservable")
            VALUES ('Espacio común', 'Áreas comunes del edificio', TRUE)
            RETURNING id;
          `);
          console.log(`✓ Tipo de espacio predeterminado creado`);
        } catch (insertError) {
          console.error('Error insertando tipo predeterminado:', insertError);
          // Continuamos aunque no se pueda insertar el tipo predeterminado
          // porque podría ser que ya exista
        }
        
        // 3. Crear tabla spaces
        await tx.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "${schema}"."spaces" (
            "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "name" VARCHAR(255) NOT NULL,
            "space_type_id" UUID NOT NULL,
            "floor" VARCHAR(50),
            "description" TEXT,
            "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "spaces_space_type_id_fkey" 
            FOREIGN KEY ("space_type_id") REFERENCES "${schema}"."space_types"("id")
          );
        `);
        console.log(`✓ Tabla spaces creada`);
        
        // 4. Crear tabla space_owners
        await tx.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "${schema}"."space_owners" (
            "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "space_id" UUID NOT NULL,
            "owner_id" UUID NOT NULL,
            "is_main" BOOLEAN DEFAULT FALSE,
            "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "space_owners_space_id_fkey" 
            FOREIGN KEY ("space_id") REFERENCES "${schema}"."spaces"("id") ON DELETE CASCADE
          );
        `);
        console.log(`✓ Tabla space_owners creada`);
        
        // 5. Verificar si existe la tabla claims
        const claimsExists = await tx.$queryRawUnsafe(`
          SELECT EXISTS (
            SELECT FROM pg_catalog.pg_tables 
            WHERE schemaname = '${schema}' AND tablename = 'claims'
          ) as exists;
        `);
        
        console.log(`📊 [SpacesSchemaService] ¿Existe la tabla claims?:`, claimsExists);
        
        if (claimsExists && claimsExists[0] && (claimsExists[0].exists === true || claimsExists[0].exists === 't')) {
          await tx.$executeRawUnsafe(`
            ALTER TABLE "${schema}"."claims"
            ADD COLUMN IF NOT EXISTS "space_id" UUID,
            ADD CONSTRAINT "claims_space_id_fkey" 
            FOREIGN KEY ("space_id") REFERENCES "${schema}"."spaces"("id") ON DELETE SET NULL;
          `);
          console.log(`✓ Tabla claims actualizada con referencia a spaces`);
        }
        
        // 6. Crear índices
        await tx.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_spaces_space_type_id" ON "${schema}"."spaces"("space_type_id");`);
        await tx.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_space_owners_space_id" ON "${schema}"."space_owners"("space_id");`);
        await tx.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_space_owners_owner_id" ON "${schema}"."space_owners"("owner_id");`);
        console.log(`✓ Índices creados`);
      });
      
      try {
        // Crear un espacio predeterminado
        const spaceTypeIdResult = await this.prisma.$queryRawUnsafe<Array<{id: string}>>(        
          `SELECT id FROM "${schema}"."space_types" LIMIT 1;`
        );
        
        console.log('Resultado de obtener spaceTypeId:', spaceTypeIdResult);
        
        if (spaceTypeIdResult && spaceTypeIdResult.length > 0 && spaceTypeIdResult[0].id) {
          await this.prisma.$executeRawUnsafe(`
            INSERT INTO "${schema}"."spaces" ("name", "space_type_id", "floor", "description")
            VALUES ('Hall de entrada', '${spaceTypeIdResult[0].id}', 'PB', 'Hall de entrada principal');
          `);
          console.log(`✓ Espacio predeterminado creado`);
        } else {
          console.log('No se pudo crear el espacio predeterminado: no se encontró un space_type_id válido');
        }
      } catch (defaultSpaceError) {
        console.error('Error creando espacio predeterminado:', defaultSpaceError);
        // No lanzamos el error para que la función principal no falle
      }
    } catch (transactionError) {
      console.error('Error en la transacción:', transactionError);
      throw new Error(`Error al crear las tablas en la transacción: ${transactionError.message}`);
    }
  }
}
