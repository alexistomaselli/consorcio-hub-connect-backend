import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // Caché para clientes de edificios
  private buildingClients = new Map<string, PrismaClient>();

  // Este método devuelve un cliente Prisma configurado para un schema específico de edificio
  // Los tipos retornados incluyen los modelos específicos de edificios como Space, SpaceOwner, etc.
  async getBuildingClient(buildingId: string): Promise<PrismaClient> {
    console.log(`[PrismaService] Obteniendo cliente para building ID: ${buildingId}`);
    
    // Verificar si ya tenemos un cliente en caché
    if (this.buildingClients.has(buildingId)) {
      console.log(`[PrismaService] Usando cliente en caché para building ID: ${buildingId}`);
      const cachedClient = this.buildingClients.get(buildingId);
      
      // Asegurar que el cliente esté definido y tenga el esquema correcto configurado
      if (cachedClient) {
        try {
          const cachedBuilding = await this.building.findUnique({
            where: { id: buildingId },
            select: { schema: true },
          });
          
          if (cachedBuilding) {
            // Refrescar la configuración del esquema para asegurar que esté activa
            await cachedClient.$executeRawUnsafe(`SET search_path TO "${cachedBuilding.schema}";`);
            console.log(`[PrismaService] Esquema refrescado para cliente en caché: ${cachedBuilding.schema}`);
          }
          
          return cachedClient;
        } catch (error) {
          console.error(`[PrismaService] Error al refrescar esquema de cliente en caché:`, error);
          // Si falla, eliminamos el cliente de la caché y creamos uno nuevo
          this.buildingClients.delete(buildingId);
          console.log(`[PrismaService] Eliminado cliente de caché con error. Creando uno nuevo...`);
        }
      } else {
        // Si el cliente está en el mapa pero es undefined, eliminar la entrada
        this.buildingClients.delete(buildingId);
        console.log(`[PrismaService] Eliminada entrada de caché inválida. Creando nuevo cliente...`);
      }
    }
    
    // Obtener información del edificio
    const building = await this.building.findUnique({
      where: { id: buildingId },
      select: { schema: true },
    });

    if (!building) {
      throw new Error(`Building with ID ${buildingId} not found`);
    }
    
    console.log(`[PrismaService] Schema del building: ${building.schema}`);
    
    try {
      // Crear un cliente Prisma específico para este esquema
      const schemaClient = new PrismaClient({
        datasources: {
          db: {
            url: `${process.env.DATABASE_URL}?schema=${building.schema}`
          }
        }
      });
      
      // Establecer el esquema para este cliente específico
      // Hacemos esto de forma redundante para asegurar que todas las conexiones
      // usen el esquema correcto
      await schemaClient.$executeRawUnsafe(`SET search_path TO "${building.schema}";`);
      
      // Verificamos que el esquema está configurado correctamente
      const schemaCheck = await schemaClient.$queryRaw`SELECT current_schema()`;
      console.log(`[PrismaService] Schema actual configurado: ${JSON.stringify(schemaCheck)}`);
      
      // Guardar el cliente en caché
      this.buildingClients.set(buildingId, schemaClient);
      console.log(`[PrismaService] Cliente creado para schema: ${building.schema}`);
      
      return schemaClient;
    } catch (error) {
      console.error(`[PrismaService] Error al crear cliente para schema:`, error);
      throw new Error(`Error al configurar schema para building: ${error.message}`);
    }
  }
}
