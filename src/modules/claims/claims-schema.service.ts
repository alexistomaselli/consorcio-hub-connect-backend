import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ClaimsSchemaService {
  constructor(private prisma: PrismaService) {}

  /**
   * Verifica y crea las tablas necesarias para el módulo de reclamos en un edificio
   */
  async ensureClaimTablesExist(buildingId: string): Promise<boolean> {
    try {
      console.log(`🔍 [ClaimsSchemaService] Verificando tablas para building: ${buildingId}`);
      
      // 1. Obtener el schema del building
      const building = await this.prisma.building.findUnique({
        where: { id: buildingId },
        select: { schema: true }
      });
      
      console.log(`📊 [ClaimsSchemaService] Resultado de búsqueda del building:`, building);
      
      if (!building) {
        console.error(`❌ [ClaimsSchemaService] Building con ID ${buildingId} no encontrado`);
        throw new Error(`Building con ID ${buildingId} no encontrado`);
      }
      
      const schema = building.schema;
      console.log(`🗂️ [ClaimsSchemaService] Schema del building: ${schema}`);
      
      // 2. Verificar si las tablas ya existen
      const tablesExist = await this.checkClaimTablesExist(schema);
      
      if (tablesExist) {
        console.log(`✅ [ClaimsSchemaService] Las tablas de reclamos ya existen en el schema "${schema}"`);
        return true;
      }
      
      // 3. Crear las tablas usando transacciones de Prisma
      await this.createClaimTables(schema);
      
      // 4. Verificar que las tablas se crearon correctamente
      const verificationResult = await this.checkClaimTablesExist(schema);
      
      if (!verificationResult) {
        throw new Error(`No se pudieron crear las tablas de reclamos en el schema "${schema}"`);
      }
      
      console.log(`✅ [ClaimsSchemaService] Tablas de reclamos creadas exitosamente en "${schema}"`);
      return true;
    } catch (error) {
      console.error(`❌ [ClaimsSchemaService] Error:`, error);
      throw new Error(`Error al crear tablas de reclamos: ${error.message}`);
    }
  }

  /**
   * Verifica si las tablas de reclamos ya existen en el schema dado
   * Usa una combinación de métodos para asegurar que la verificación sea robusta
   */
  async checkClaimTablesExist(schema: string): Promise<boolean> {
    try {
      console.log(`🔍 [ClaimsSchemaService] Verificando existencia de tablas en schema: ${schema}`);
      
      // Método 1: Verificar si podemos contar registros en las tablas
      try {
        // Intentamos hacer una consulta COUNT a la tabla claims
        // Si la tabla no existe, esto lanzará una excepción
        const claimsCount = await this.prisma.$queryRawUnsafe<Array<{count: number}>>(`
          SELECT COUNT(*) as count FROM "${schema}".claims;
        `);
        
        console.log(`📊 [ClaimsSchemaService] Conteo de claims:`, claimsCount);
        
        // Si llegamos aquí, la tabla existe
        return true;
      } catch (queryError) {
        console.log(`⚠️ [ClaimsSchemaService] Error al consultar claims:`, queryError.message);
        
        // Si el error es porque la tabla no existe, intentamos el siguiente método
        if (queryError.message.includes('does not exist') || queryError.code === 'P2021') {
          console.log(`⚠️ [ClaimsSchemaService] La tabla claims no existe según el método 1`);
        } else {
          // Si es otro tipo de error, lo propagamos
          throw queryError;
        }
      }
      
      // Método 2: Verificar usando pg_catalog (más confiable pero más bajo nivel)
      const requiredTables = ['claims', 'claim_comments', 'claim_images'];
      let allTablesExist = true;
      
      for (const table of requiredTables) {
        console.log(`👀 [ClaimsSchemaService] Verificando tabla: ${table} usando pg_catalog`);
        const tableExistsQuery = await this.prisma.$queryRawUnsafe<Array<{exists: boolean | string}>>(`
          SELECT EXISTS (
            SELECT FROM pg_catalog.pg_tables 
            WHERE schemaname = '${schema}' AND tablename = '${table}'
          ) as exists;
        `);
        
        console.log(`🔍 [ClaimsSchemaService] Resultado de verificación para ${table}:`, tableExistsQuery);
        
        // El resultado viene como [{ exists: true|false }]
        const tableExists = tableExistsQuery[0] && (tableExistsQuery[0].exists === true || tableExistsQuery[0].exists === 't');
        
        if (!tableExists) {
          console.log(`❌ [ClaimsSchemaService] La tabla ${table} no existe.`);
          allTablesExist = false;
          break;
        }
      }
      
      console.log(`✅ [ClaimsSchemaService] Resultado final de verificación: ${allTablesExist}`);
      return allTablesExist;
    } catch (error) {
      console.error(`❌ [ClaimsSchemaService] Error al verificar tablas:`, error);
      return false;
    }
  }

  /**
   * Crea todas las tablas necesarias para el módulo de reclamos
   */
  async createClaimTables(schema: string): Promise<void> {
    try {
      console.log(`🏗️ [ClaimsSchemaService] Creando tablas de reclamos en schema: ${schema}`);
      
      // Usar una transacción para asegurar la consistencia
      await this.prisma.$transaction(async (tx) => {
        // 1. Crear tabla claims
        await tx.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "${schema}"."claims" (
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
            "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
          );
        `);
        console.log(`✓ Tabla claims creada`);

        // Verificar si existe la tabla spaces para añadir la restricción de clave foránea
        const spacesExists = await tx.$queryRawUnsafe<Array<{exists: boolean | string}>>(`
          SELECT EXISTS (
            SELECT FROM pg_catalog.pg_tables 
            WHERE schemaname = '${schema}' AND tablename = 'spaces'
          ) as exists;
        `);
        
        console.log(`📊 [ClaimsSchemaService] ¿Existe la tabla spaces?:`, spacesExists);
        
        if (spacesExists && spacesExists[0] && (spacesExists[0].exists === true || spacesExists[0].exists === 't')) {
          await tx.$executeRawUnsafe(`
            ALTER TABLE "${schema}"."claims"
            ADD CONSTRAINT "claims_space_id_fkey" 
            FOREIGN KEY ("space_id") REFERENCES "${schema}"."spaces"("id") ON DELETE SET NULL;
          `);
          console.log(`✓ Restricción de clave foránea añadida para space_id`);
        } else {
          console.log(`⚠️ La tabla spaces no existe, no se añadió la restricción de clave foránea`);
        }
        
        // 2. Crear tabla claim_comments
        await tx.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "${schema}"."claim_comments" (
            "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "content" TEXT NOT NULL,
            "claim_id" UUID NOT NULL,
            "user_id" UUID NOT NULL,
            "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "claim_comments_claim_id_fkey" 
            FOREIGN KEY ("claim_id") REFERENCES "${schema}"."claims"("id") ON DELETE CASCADE
          );
        `);
        console.log(`✓ Tabla claim_comments creada`);
        
        // 3. Crear tabla claim_images
        await tx.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "${schema}"."claim_images" (
            "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "claim_id" UUID NOT NULL,
            "url" TEXT NOT NULL,
            "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "claim_images_claim_id_fkey" 
            FOREIGN KEY ("claim_id") REFERENCES "${schema}"."claims"("id") ON DELETE CASCADE
          );
        `);
        console.log(`✓ Tabla claim_images creada`);
        
        // 4. Crear índices
        await tx.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_claims_status" ON "${schema}"."claims"("status");`);
        await tx.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_claims_creator_id" ON "${schema}"."claims"("creator_id");`);
        await tx.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_claims_space_id" ON "${schema}"."claims"("space_id");`);
        await tx.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_claim_comments_claim_id" ON "${schema}"."claim_comments"("claim_id");`);
        await tx.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_claim_images_claim_id" ON "${schema}"."claim_images"("claim_id");`);
        console.log(`✓ Índices creados`);
      });
    } catch (transactionError) {
      console.error(`❌ [ClaimsSchemaService] Error en la transacción:`, transactionError);
      throw new Error(`Error al crear las tablas en la transacción: ${transactionError.message}`);
    }
  }
}
