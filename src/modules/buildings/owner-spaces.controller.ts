import { Controller, Get, Param, UseGuards, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { SpacesService } from '../spaces/spaces.service';
import { PrismaService } from '../../prisma/prisma.service';

// Interface para tipar el resultado de la consulta SQL de unidades del propietario
interface OwnerUnit {
  id?: string;
  unit_id?: string;
}

/**
 * Controlador específico para manejar los espacios asociados a un propietario dentro de un edificio
 */
@Controller('buildings/:buildingId/owner-spaces')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OwnerSpacesController {
  private readonly logger = new Logger(OwnerSpacesController.name);

  constructor(
    private readonly spacesService: SpacesService,
    private readonly prisma: PrismaService
  ) {}

  /**
   * Obtiene todos los espacios comunes del edificio + unidades específicas del propietario
   * @param buildingId ID del edificio
   * @param userId ID del propietario
   * @returns Lista de espacios filtrados según el criterio
   */
  @Get(':userId')
  @Roles(UserRole.BUILDING_ADMIN, UserRole.OWNER)
  async getOwnerSpaces(
    @Param('buildingId') buildingId: string,
    @Param('userId') userId: string,
  ) {
    try {
      this.logger.log(`Obteniendo espacios para owner: ${userId} en building: ${buildingId}`);

      // 0. Obtener el esquema del edificio desde la base de datos
      const building = await this.prisma.building.findUnique({
        where: { id: buildingId },
        select: { schema: true }
      });
      
      if (!building) {
        throw new HttpException(`Edificio con ID ${buildingId} no encontrado`, HttpStatus.NOT_FOUND);
      }
      
      const buildingSchema = building.schema;
      this.logger.log(`Esquema del edificio: ${buildingSchema}`);
      
      // 1. Obtener todos los espacios del edificio
      const allSpaces = await this.spacesService.findAllSpacesSimplified(buildingId);
      this.logger.log(`Espacios totales encontrados: ${allSpaces.length}`);
      
      // 2. Obtener las unidades asociadas a este propietario
      let ownerUnits: OwnerUnit[] = [];
      
      try {
        // Intentar primero la consulta directa usando el esquema obtenido de la base de datos
        const ownersQuery = `
          SELECT s.id, s.space_type_id as unit_id 
          FROM "${buildingSchema}".spaces s
          JOIN "${buildingSchema}".space_owners so ON s.id = so.space_id
          WHERE so.owner_id = '${userId}'
        `;
        
        ownerUnits = await this.prisma.$queryRawUnsafe(ownersQuery);
        this.logger.log(`Consulta ejecutada con éxito usando esquema ${buildingSchema}`);
      } catch (error) {
        // Si falla la consulta principal, probar verificar estructuras y ofrecer mensaje más detallado
        this.logger.warn(`Error en consulta principal: ${error.message}`);
        
        // Verificar si las tablas existen en el esquema
        const tablesQuery = `
          SELECT table_name FROM information_schema.tables 
          WHERE table_schema = '${buildingSchema}' 
          AND table_name IN ('spaces', 'space_owners')
        `;
        
        const tables = await this.prisma.$queryRawUnsafe(tablesQuery);
        
        if (!Array.isArray(tables) || tables.length < 2) {
          throw new HttpException(
            `Tablas necesarias (spaces, space_owners) no encontradas en esquema ${buildingSchema}`, 
            HttpStatus.NOT_FOUND
          );
        }
        
        // Las tablas existen pero seguimos teniendo error
        throw new HttpException(
          `Error al consultar unidades del propietario: ${error.message}`, 
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
      
      this.logger.log(`Unidades del propietario encontradas: ${ownerUnits.length}`);
      
      // Crear un Set con los IDs de las unidades del propietario para búsqueda eficiente
      const ownerUnitIds = new Set<string>();
      ownerUnits.forEach((unit: OwnerUnit) => {
        if (unit.id) ownerUnitIds.add(unit.id);
        if (unit.unit_id) ownerUnitIds.add(unit.unit_id);
      });
      
      // Si no encontramos ninguna unidad, simplemente logueamos para diagnóstico
      if (ownerUnitIds.size === 0) {
        this.logger.warn(`No se encontraron unidades asociadas al propietario ${userId}`);
      }
      
      // 3. Filtrar espacios:
      // - Si es una unidad, incluir solo si pertenece al propietario
      // - Si es otro tipo de espacio, incluir siempre
      const filteredSpaces = allSpaces.filter(space => {
        // Verificar si el espacio tiene un tipo definido
        if (!space.type || !space.type.name) {
          // Si no tiene tipo definido, incluirlo por defecto
          return true;
        }
        
        const isUnitSpace = space.type.name.toLowerCase() === 'unidad';
        
        if (isUnitSpace) {
          // Si es unidad, verificar si pertenece al propietario
          const belongs = ownerUnitIds.has(space.id);
          return belongs;
        } else {
          // Si no es unidad, incluir siempre (espacio común)
          return true;
        }
      });
      
      this.logger.log(`Espacios filtrados para el propietario: ${filteredSpaces.length}`);
      
      return filteredSpaces;
    } catch (error) {
      this.logger.error(`Error al obtener espacios del propietario: ${error.message}`, error.stack);
      
      // Mejorar el mensaje de error para el cliente
      if (error instanceof HttpException) {
        throw error; // Si ya es un HttpException, simplemente re-lanzarlo
      } else {
        throw new HttpException(
          `Error al procesar la solicitud: ${error.message}`, 
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
    }
  }
}
