import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards, HttpException, HttpStatus, Query } from '@nestjs/common';
import { SpacesService } from './spaces.service';
import { CreateSpaceTypeDto } from './dto/create-space-type.dto';
import { CreateSpaceDto } from './dto/create-space.dto';
import { AssignOwnerDto } from './dto/assign-owner.dto';
import { GenerateUnitsDto } from './dto/generate-units.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { SpacesSchemaService } from './spaces-schema.service';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('buildings/:buildingId/spaces')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SpacesController {
  constructor(
    private readonly spacesService: SpacesService,
    private readonly spacesSchemaService: SpacesSchemaService,
    private readonly prisma: PrismaService
  ) {}

  // -------------------- Setup Tables --------------------

  @Get('check-tables')
  @UseGuards(JwtAuthGuard)
  // Sin roles requeridos para este endpoint
  async checkTables(@Param('buildingId') buildingId: string) {
    try {
      console.log(`[SpacesController] Verificando tablas para building: ${buildingId}`);
      
      // Obtener el schema del building
      const building = await this.prisma.building.findUnique({
        where: { id: buildingId },
        select: { schema: true }
      });
      
      if (!building) {
        return {
          error: true,
          message: `Building con ID ${buildingId} no encontrado`,
          setup_required: true
        };
      }
      
      // Verificar si las tablas existen
      const tablesExist = await this.spacesSchemaService.checkSpaceTablesExist(building.schema);
      
      return {
        setup_required: !tablesExist,
        message: tablesExist ? 'Las tablas ya existen' : 'Se requiere configurar las tablas'
      };
    } catch (error) {
      console.error(`[SpacesController] Error al verificar tablas:`, error);
      return {
        error: true,
        message: `Error al verificar tablas: ${error.message}`,
        setup_required: true
      };
    }
  }

  @Post('setup-tables')
  @UseGuards(JwtAuthGuard)
  // Sin roles requeridos para este endpoint
  async setupTables(@Param('buildingId') buildingId: string, @Request() req) {
    try {
      console.log(`[SpacesController] Iniciando configuración de tablas para building: ${buildingId}`);
      console.log('[SpacesController] Usuario actual:', req.user);
      const result = await this.spacesSchemaService.ensureSpaceTablesExist(buildingId);
      
      console.log(`[SpacesController] Resultado de configuración: ${result}`);
      return {
        success: result,
        message: 'Tablas de espacios configuradas correctamente'
      };
    } catch (error) {
      console.error(`[SpacesController] Error al configurar tablas de espacios:`, error);
      // Devolver un error más detallado pero sin exponer detalles sensibles
      return {
        success: false,
        message: `Error al configurar tablas de espacios: ${error.message}`
      };
    }
  }

  // -------------------- Space Types --------------------

  @Post('types')
  // Temporalmente permitimos cualquier rol para facilitar la configuración inicial
  // @Roles(UserRole.BUILDING_ADMIN)
  async createSpaceType(
    @Param('buildingId') buildingId: string,
    @Body() createSpaceTypeDto: CreateSpaceTypeDto,
    @Request() req,
  ) {
    try {
      console.log(`[SpacesController] Creando tipo de espacio para building ${buildingId}:`, createSpaceTypeDto);
      console.log(`[SpacesController] Usuario que realiza la solicitud:`, req.user);
      
      // Verificar si el building existe
      const building = await this.prisma.building.findUnique({
        where: { id: buildingId },
        select: { schema: true }
      });
      
      if (!building) {
        console.error(`[SpacesController] Building con ID ${buildingId} no encontrado`);
        return {
          error: true,
          message: `Building con ID ${buildingId} no encontrado`,
          status: 404
        };
      }
      
      console.log(`[SpacesController] Building encontrado con schema: ${building.schema}`);
      
      // Verificar si las tablas existen
      const tablesExist = await this.spacesSchemaService.checkSpaceTablesExist(building.schema);
      console.log(`[SpacesController] ¿Existen las tablas de espacios? ${tablesExist}`);
      
      if (!tablesExist) {
        console.log(`[SpacesController] Las tablas no existen. Creándolas...`);
        // En lugar de indicar que se requiere configuración, intentamos crearlas
        await this.spacesSchemaService.ensureSpaceTablesExist(buildingId);
        console.log(`[SpacesController] Tablas creadas. Creando tipo de espacio...`);
        
        // Intentamos nuevamente crear el tipo de espacio
        return await this.spacesService.createSpaceType(buildingId, createSpaceTypeDto);
      }
      
      // Crear el tipo de espacio
      console.log(`[SpacesController] Llamando a spacesService.createSpaceType`);
      return await this.spacesService.createSpaceType(buildingId, createSpaceTypeDto);
    } catch (error) {
      console.error(`[SpacesController] Error al crear tipo de espacio:`, error);
      return {
        error: true,
        message: 'Error al crear el tipo de espacio',
        details: error.message,
        status: 500
      };
    }
  }

  @Get('types')
  @Roles(UserRole.BUILDING_ADMIN, UserRole.OWNER)
  async findAllSpaceTypes(@Param('buildingId') buildingId: string) {
    try {
      console.log(`[SpacesController] Obteniendo tipos de espacios para building: ${buildingId}`);
      
      // Primero asegurémonos de que las tablas existan
      try {
        // En lugar de solo verificar, asegurémonos de que las tablas existan
        // Esto creará las tablas si no existen
        await this.spacesSchemaService.ensureSpaceTablesExist(buildingId);
        
        // Una vez que estamos seguros de que las tablas existen, obtenemos los tipos de espacios
        console.log(`[SpacesController] Tablas verificadas, obteniendo tipos de espacios...`);
        const spaceTypes = await this.spacesService.findAllSpaceTypes(buildingId);
        console.log(`[SpacesController] Tipos de espacios obtenidos:`, spaceTypes);
        
        // Si llegamos aquí, las tablas existen y devolvemos los tipos (aunque sea un array vacío)
        return spaceTypes;
      } catch (serviceError) {
        console.error(`[SpacesController] Error en el servicio de espacios:`, serviceError);
        
        // Si el error menciona que la tabla no existe, indicamos que se requiere configuración
        // Si el error es de tabla inexistente, intentamos crearlas en lugar de devolver un error
        if (serviceError.message && (
          serviceError.message.includes('no existe') ||
          serviceError.message.includes('does not exist') ||
          serviceError.code === 'P2021'
        )) {
          console.log(`[SpacesController] Intentando crear las tablas ya que no existen...`);
          try {
            await this.spacesSchemaService.ensureSpaceTablesExist(buildingId);
            // Intentar nuevamente obtener los tipos
            return await this.spacesService.findAllSpaceTypes(buildingId);
          } catch (setupError) {
            // Si falla la creación, devolvemos un array vacío
            console.error(`[SpacesController] No se pudieron crear las tablas:`, setupError);
            return [];
          }
        }
        
        // Para otros errores del servicio
        return {
          error: true,
          message: `Error al obtener los tipos de espacios: ${serviceError.message}`,
          setup_required: false
        };
      }
    } catch (error) {
      console.error(`[SpacesController] Error general:`, error);
      return {
        error: true,
        message: 'Error al procesar la solicitud de tipos de espacios',
        setup_required: true
      };
    }
  }

  @Get('types/:id')
  @Roles(UserRole.BUILDING_ADMIN, UserRole.OWNER)
  findSpaceType(@Param('buildingId') buildingId: string, @Param('id') id: string) {
    return this.spacesService.findSpaceType(buildingId, id);
  }

  @Patch('types/:id')
  @Roles(UserRole.BUILDING_ADMIN)
  async updateSpaceType(
    @Param('buildingId') buildingId: string,
    @Param('id') id: string,
    @Body() updateSpaceTypeDto: CreateSpaceTypeDto,
  ) {
    try {
      console.log(`[SpacesController] Actualizando tipo de espacio: ${id} en building: ${buildingId}`, updateSpaceTypeDto);
      
      // Verificar que el building existe
      const building = await this.prisma.building.findUnique({
        where: { id: buildingId },
        select: { schema: true }
      });
      
      if (!building) {
        console.error(`[SpacesController] Building con ID ${buildingId} no encontrado`);
        return {
          error: true,
          message: `Building con ID ${buildingId} no encontrado`,
          status: 404
        };
      }
      
      // Verificar que las tablas existen
      const tablesExist = await this.spacesSchemaService.checkSpaceTablesExist(building.schema);
      if (!tablesExist) {
        console.error(`[SpacesController] Las tablas no existen en el schema ${building.schema}`);
        return {
          error: true,
          message: 'Las tablas de espacios no existen',
          setup_required: true,
          status: 400
        };
      }
      
      // Verificar que el tipo de espacio existe
      try {
        const result = await this.spacesService.updateSpaceType(buildingId, id, updateSpaceTypeDto);
        console.log(`[SpacesController] Tipo de espacio actualizado exitosamente:`, result);
        return result;
      } catch (error) {
        console.error(`[SpacesController] Error al actualizar tipo de espacio:`, error);
        
        // Detectar si es un error de tipo no encontrado
        if (error.code === 'P2025' || error.message?.includes('Record to update not found')) {
          return {
            error: true,
            message: `Tipo de espacio con ID ${id} no encontrado`,
            status: 404
          };
        }
        
        // Para otros errores
        return {
          error: true,
          message: `Error al actualizar tipo de espacio: ${error.message}`,
          status: 500,
          details: error.stack
        };
      }
    } catch (error) {
      console.error(`[SpacesController] Error general al actualizar tipo de espacio:`, error);
      return {
        error: true,
        message: `Error al procesar la solicitud: ${error.message}`,
        status: 500
      };
    }
  }

  @Delete('types/:id')
  @Roles(UserRole.BUILDING_ADMIN)
  removeSpaceType(@Param('buildingId') buildingId: string, @Param('id') id: string) {
    return this.spacesService.removeSpaceType(buildingId, id);
  }

  // -------------------- Spaces --------------------

  @Post()
  @Roles(UserRole.BUILDING_ADMIN)
  async createSpace(
    @Param('buildingId') buildingId: string,
    @Body() createSpaceDto: CreateSpaceDto,
  ) {
    try {
      console.log(`[SpacesController] Creando espacio en building ${buildingId}:`, createSpaceDto);
      
      // Primero asegurémonos de que las tablas existan
      await this.spacesSchemaService.ensureSpaceTablesExist(buildingId);
      
      // Intentar crear el espacio
      const result = await this.spacesService.createSpace(buildingId, createSpaceDto);
      console.log(`[SpacesController] Espacio creado exitosamente:`, result);
      return result;
    } catch (error) {
      console.error(`[SpacesController] Error al crear espacio:`, error);
      return {
        error: true,
        message: `Error al crear espacio: ${error.message}`,
        details: error.stack
      };
    }
  }

  @Get()
  @Roles(UserRole.BUILDING_ADMIN, UserRole.OWNER)
  async findAllSpaces(@Param('buildingId') buildingId: string) {
    try {
      console.log(`[SpacesController] Obteniendo espacios para building: ${buildingId}`);
      
      // Primero asegurémonos de que las tablas existan
      try {
        // En lugar de solo verificar, asegurémonos de que las tablas existan
        // Esto creará las tablas si no existen
        await this.spacesSchemaService.ensureSpaceTablesExist(buildingId);
        
        // Una vez que estamos seguros de que las tablas existen, obtenemos los espacios
        console.log(`[SpacesController] Tablas verificadas, obteniendo espacios con el método simplificado...`);
        // Usamos el método mejorado que corrige los IDs de los propietarios
        return this.spacesService.findAllSpacesSimplified(buildingId);
      } catch (setupError) {
        console.error(`[SpacesController] Error al configurar tablas:`, setupError);
        // Si falló la configuración por un error grave, devolvemos un array vacío
        console.error(`[SpacesController] No se pudieron configurar las tablas:`, setupError);
        return [];
      }
    } catch (error) {
      console.error(`[SpacesController] Error al obtener espacios:`, error);
      // No propagar el error, devolver respuesta controlada
      return {
        error: true,
        message: 'Error al procesar la solicitud de espacios'
      };
    }
  }

  @Get(':buildingId/:id')
  @Roles(UserRole.BUILDING_ADMIN, UserRole.OWNER)
  findSpace(@Param('buildingId') buildingId: string, @Param('id') id: string) {
    return this.spacesService.findSpace(buildingId, id);
  }

  // Endpoint de diagnóstico para visualizar los datos de propietarios
  @Get('debug/owners')
  async debugOwnersData(@Param('buildingId') buildingId: string) {
    console.log(`[SpacesController] DEBUG OWNERS para building ${buildingId}`);
    return this.spacesService.debugOwnersData(buildingId);
  }

  @Patch(':id')
  @Roles(UserRole.BUILDING_ADMIN)
  updateSpace(
    @Param('buildingId') buildingId: string,
    @Param('id') id: string,
    @Body() updateSpaceDto: CreateSpaceDto,
  ) {
    return this.spacesService.updateSpace(buildingId, id, updateSpaceDto);
  }

  @Delete(':id')
  @Roles(UserRole.BUILDING_ADMIN)
  async removeSpace(@Param('buildingId') buildingId: string, @Param('id') id: string) {
    try {
      const result = await this.spacesService.removeSpace(buildingId, id);
      return result;
    } catch (error) {
      // Registrar el error para debugging
      console.error(`[SpacesController] Error al eliminar espacio:`, error);
      
      // Si el error contiene un mensaje específico sobre reclamos asociados, devolver un error de negocio
      if (error.message && error.message.includes('reclamos asociados')) {
        throw new HttpException(
          {
            message: error.message,
            error: 'Bad Request'
          },
          HttpStatus.BAD_REQUEST
        );
      }
      
      // Para otros errores, lanzar un error genérico pero con código 200 para evitar el error en el frontend
      // ya que el frontend está interpretando correctamente solo respuestas con estado 200
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Error al eliminar espacio',
          error: 'Internal Server Error'
        },
        HttpStatus.OK // Devolvemos OK (200) en lugar de INTERNAL_SERVER_ERROR (500)
      );
    }
  }

  // -------------------- Space Owners --------------------

  @Post(':id/owners')
  @Roles(UserRole.BUILDING_ADMIN)
  async assignOwnerToSpace(
    @Param('buildingId') buildingId: string,
    @Param('id') spaceId: string,
    @Body() assignOwnerDto: AssignOwnerDto,
  ) {
    try {
      console.log(`[SpacesController] Intentando asignar propietario ${assignOwnerDto.ownerId} al espacio ${spaceId} en building ${buildingId}`);
      const result = await this.spacesService.assignOwnerToSpace(buildingId, spaceId, assignOwnerDto);
      console.log(`[SpacesController] Asignación exitosa:`, result);
      return result;
    } catch (error) {
      console.error(`[SpacesController] Error al asignar propietario:`, error);
      
      // Devolver error con detalles en vez de error 500 genérico
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Error al asignar propietario al espacio',
          error: 'Error de asignación',
          details: {
            buildingId,
            spaceId,
            ownerId: assignOwnerDto.ownerId,
            errorStack: error.stack
          }
        },
        HttpStatus.OK // Devolvemos OK (200) en lugar de INTERNAL_SERVER_ERROR (500)
      );
    }
  }

  @Delete(':id/owners/:ownerId')
  @Roles(UserRole.BUILDING_ADMIN)
  removeOwnerFromSpace(
    @Param('buildingId') buildingId: string,
    @Param('id') spaceId: string,
    @Param('ownerId') ownerId: string,
  ) {
    return this.spacesService.removeOwnerFromSpace(buildingId, spaceId, ownerId);
  }

  @Get('debug/owners')
  // Quitamos temporalmente la restricción de roles para diagnóstico
  async debugOwners(@Param('buildingId') buildingId: string) {
    try {
      // Obtener el esquema del edificio
      const building = await this.prisma.building.findUnique({
        where: { id: buildingId },
        select: { schema: true }
      });
      
      if (!building) {
        throw new HttpException(`Building con ID ${buildingId} no encontrado`, HttpStatus.NOT_FOUND);
      }
      
      console.log(`[DEBUG] Consultando propietarios en schema: ${building.schema}`);
      
      // Obtener todos los propietarios directamente
      const query = `
        SELECT 
          so.*,
          u.first_name,
          u.last_name,
          u.email 
        FROM "${building.schema}".space_owners so
        LEFT JOIN public.users u ON so.owner_id = u.id
      `;
      
      console.log(`[DEBUG] Query: ${query}`);
      
      const owners = await this.prisma.$queryRawUnsafe(query) as any[];
      
      return {
        schema: building.schema,
        total: owners.length,
        owners: owners
      };
    } catch (error) {
      console.error('[DEBUG] Error:', error);
      throw new HttpException(
        `Error obteniendo propietarios: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // -------------------- Generate Units --------------------

  @Post('generate-units')
  // Temporalmente permitimos cualquier rol para facilitar la configuración inicial
  // @Roles(UserRole.BUILDING_ADMIN)
  async generateUnits(
    @Param('buildingId') buildingId: string,
    @Body() generateUnitsDto: GenerateUnitsDto,
    @Request() req,
  ) {
    try {
      console.log(`[SpacesController] Generando unidades para building ${buildingId}:`, generateUnitsDto);
      console.log(`[SpacesController] Usuario que realiza la solicitud:`, req.user);
      
      // Verificar si el building existe
      const building = await this.prisma.building.findUnique({
        where: { id: buildingId },
        select: { schema: true }
      });
      
      if (!building) {
        console.error(`[SpacesController] Building con ID ${buildingId} no encontrado`);
        return {
          error: true,
          message: `Building con ID ${buildingId} no encontrado`,
          status: 404
        };
      }
      
      console.log(`[SpacesController] Building encontrado con schema: ${building.schema}`);
      
      // Verificar si las tablas existen
      const tablesExist = await this.spacesSchemaService.checkSpaceTablesExist(building.schema);
      console.log(`[SpacesController] ¿Existen las tablas de espacios? ${tablesExist}`);
      
      if (!tablesExist) {
        console.log(`[SpacesController] Las tablas no existen. Creándolas...`);
        // En lugar de indicar que se requiere configuración, intentamos crearlas
        await this.spacesSchemaService.ensureSpaceTablesExist(buildingId);
        console.log(`[SpacesController] Tablas creadas.`);
      }
      
      // Generar unidades
      console.log(`[SpacesController] Llamando a spacesService.generateUnits`);
      return await this.spacesService.generateUnits(buildingId, generateUnitsDto);
    } catch (error) {
      console.error(`[SpacesController] Error al generar unidades:`, error);
      return {
        error: true,
        message: 'Error al generar unidades',
        details: error.message,
        status: 500
      };
    }
  }
}
