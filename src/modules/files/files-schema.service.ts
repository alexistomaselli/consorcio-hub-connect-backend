import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FilesSchemaService {
  constructor(private prisma: PrismaService) {}

  /**
   * Verifica y crea la tabla necesaria para el módulo de files en un edificio
   */
  async ensureFilesTableExists(buildingId: string): Promise<boolean> {
    try {
      console.log(`🔍 [FilesSchemaService] Verificando tabla para building: ${buildingId}`);
      
      // 1. Obtener el schema del building
      const building = await this.prisma.building.findUnique({
        where: { id: buildingId },
        select: { schema: true }
      });
      
      console.log(`📊 [FilesSchemaService] Resultado de búsqueda del building:`, building);
      
      if (!building) {
        console.error(`❌ [FilesSchemaService] Building con ID ${buildingId} no encontrado`);
        throw new Error(`Building con ID ${buildingId} no encontrado`);
      }
      
      const schema = building.schema;
      console.log(`🗂️ [FilesSchemaService] Schema del building: ${schema}`);
      
      // 2. Verificar si la tabla ya existe
      const tableExists = await this.checkFilesTableExists(schema);
      
      if (tableExists) {
        console.log(`✅ [FilesSchemaService] La tabla files ya existe en el schema "${schema}"`);
        return true;
      }
      
      // 3. Crear la tabla usando transacciones de Prisma
      await this.createFilesTable(schema);
      
      // 4. Verificar que la tabla se creó correctamente
      const verificationResult = await this.checkFilesTableExists(schema);
      
      if (!verificationResult) {
        throw new Error(`No se pudo crear la tabla files en el schema "${schema}"`);
      }
      
      console.log(`✅ [FilesSchemaService] Tabla files creada exitosamente en "${schema}"`);
      return true;
    } catch (error) {
      console.error(`❌ [FilesSchemaService] Error:`, error);
      throw new Error(`Error al crear tabla files: ${error.message}`);
    }
  }

  /**
   * Verifica si la tabla files ya existe en el schema dado
   */
  async checkFilesTableExists(schema: string): Promise<boolean> {
    try {
      console.log(`🔍 [FilesSchemaService] Verificando existencia de tabla en schema: ${schema}`);
      
      // Método 1: Verificar si podemos contar registros en la tabla
      try {
        // Intentamos hacer una consulta COUNT a la tabla files
        // Consultar directamente si existe la tabla en el schema
        const filesCount = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*) 
          FROM information_schema.tables 
          WHERE table_schema = ${schema} 
          AND table_name = 'files'
        `;
        
        // Convertir explícitamente el BigInt a Number para prevenir errores de serialización
        const transformedCount = filesCount.map(item => ({
          count: item.count ? Number(item.count) : 0
        }));
        
        console.log(`📊 [FilesSchemaService] Conteo de files:`, transformedCount);
        
        // Si llegamos aquí, la tabla existe
        return true;
      } catch (queryError) {
        console.log(`⚠️ [FilesSchemaService] Error al consultar files:`, queryError.message);
        
        // Si el error es porque la tabla no existe, confirmamos que no existe
        if (queryError.message.includes('does not exist') || queryError.code === 'P2021') {
          console.log(`⚠️ [FilesSchemaService] La tabla files no existe según el método 1`);
          return false;
        } else {
          // Si es otro tipo de error, lo propagamos
          throw queryError;
        }
      }
    } catch (error) {
      console.error(`❌ [FilesSchemaService] Error al verificar tabla:`, error);
      throw error;
    }
  }

  /**
   * Crea la tabla files en el schema especificado
   */
  async createFilesTable(schema: string) {
    try {
      console.log(`[FilesSchemaService] Creando tabla files para el schema ${schema}...`);
      
      // 1. Crear extensiones por separado (fuera de la transacción principal)
      try {
        console.log(`🔍 [FilesSchemaService] Habilitando extensión pgcrypto...`);
        await this.prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA public;`);
        console.log(`✅ Extensión pgcrypto habilitada en schema public`);
      } catch (extError) {
        console.warn(`⚠️ [FilesSchemaService] No se pudo habilitar pgcrypto en schema public:`, extError.message);
        try {
          console.log(`💡 Intentando habilitar pgcrypto sin schema específico...`);
          await this.prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
          console.log(`✅ Extensión pgcrypto habilitada (sin schema)`);
        } catch (err2) {
          console.warn(`⚠️ No se pudo crear extensión pgcrypto:`, err2.message);
        }
      }

      // 2. Verificar disponibilidad de gen_random_uuid()
      let useUuidOssp = false;
      try {
        const testUuid = await this.prisma.$queryRawUnsafe(`SELECT gen_random_uuid() as test_uuid;`);
        console.log(`✅ Función gen_random_uuid() disponible:`, testUuid);
      } catch (uuidErr) {
        console.error(`❌ Error con gen_random_uuid():`, uuidErr.message);
        // Intentar con uuid-ossp
        try {
          console.log(`💡 Habilitando extensión uuid-ossp...`);
          await this.prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
          console.log(`✅ Extensión uuid-ossp habilitada`);
          useUuidOssp = true;
        } catch (ossp) {
          console.error(`❌ Error al habilitar uuid-ossp:`, ossp.message);
          // Continuamos de todos modos, esperando que alguna esté disponible
        }
      }
      
      // 3. Crear la tabla files
      const uuidFunction = useUuidOssp ? 'uuid_generate_v4()' : 'gen_random_uuid()';
      console.log(`💾 Creando tabla files en "${schema}" usando ${uuidFunction}...`);
      
      const createTableSql = `
        CREATE TABLE IF NOT EXISTS "${schema}".files (
          id UUID PRIMARY KEY DEFAULT ${uuidFunction},
          type VARCHAR(50) NOT NULL,
          name VARCHAR(255) NOT NULL,
          owner_id UUID NOT NULL,
          filename VARCHAR(255) NOT NULL,
          file_url TEXT NOT NULL,
          file_size BIGINT NOT NULL,
          mime_type VARCHAR(100) NOT NULL,
          is_processed BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `;
      
      await this.prisma.$executeRawUnsafe(createTableSql);
      console.log(`✅ Tabla files creada exitosamente`);
      
      // 4. Crear índices uno por uno
      console.log(`🔍 Creando índices...`);
      await this.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_files_type ON "${schema}".files(type);`);
      console.log(`✅ Índice para type creado`);
      
      await this.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_files_owner ON "${schema}".files(owner_id);`);
      console.log(`✅ Índice para owner_id creado`);
      
      console.log(`✅ [FilesSchemaService] Tabla files creada exitosamente en schema "${schema}"`);
      return true;
    } catch (error) {
      console.error(`❌ [FilesSchemaService] Error al crear tabla:`, error);
      throw new Error(`Error al crear tabla files: ${error.message}`);
    }
  }
}
