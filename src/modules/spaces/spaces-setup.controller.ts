import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SpacesService } from './spaces.service';
import { SpacesSchemaService } from './spaces-schema.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSpaceTypeDto } from './dto/create-space-type.dto';
import { GenerateUnitsDto } from './dto/generate-units.dto';

/**
 * Controlador especial para el wizard de configuración de espacios.
 * Este controlador sólo requiere JwtAuthGuard (autenticación) pero no RolesGuard
 * para permitir la configuración inicial sin restricciones de rol.
 */
@Controller('buildings/:buildingId/spaces-setup')
@UseGuards(JwtAuthGuard) // Solo autenticación, sin restricciones de rol
export class SpacesSetupController {
  constructor(
    private readonly spacesService: SpacesService,
    private readonly spacesSchemaService: SpacesSchemaService,
    private readonly prisma: PrismaService
  ) {}

  /**
   * Verifica si las tablas de espacios existen
   */
  @Get('check-tables')
  async checkTables(@Param('buildingId') buildingId: string) {
    try {
      console.log(`[SpacesSetupController] Verificando tablas para building: ${buildingId}`);
      
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
      console.error(`[SpacesSetupController] Error al verificar tablas:`, error);
      return {
        error: true,
        message: `Error al verificar tablas: ${error.message}`,
        setup_required: true
      };
    }
  }

  /**
   * Configura las tablas de espacios
   */
  @Post('setup-tables')
  async setupTables(@Param('buildingId') buildingId: string, @Request() req) {
    try {
      console.log(`[SpacesSetupController] Configurando tablas para building: ${buildingId}`);
      console.log(`[SpacesSetupController] Usuario:`, req.user);
      
      const result = await this.spacesSchemaService.ensureSpaceTablesExist(buildingId);
      
      return {
        success: result,
        message: 'Tablas de espacios configuradas correctamente'
      };
    } catch (error) {
      console.error(`[SpacesSetupController] Error al configurar tablas:`, error);
      return {
        success: false,
        message: `Error al configurar tablas: ${error.message}`
      };
    }
  }

  /**
   * Crea un tipo de espacio (endpoint sin restricciones de rol)
   */
  @Post('create-space-type')
  async createSpaceType(
    @Param('buildingId') buildingId: string,
    @Body() createSpaceTypeDto: CreateSpaceTypeDto,
    @Request() req
  ) {
    try {
      console.log(`[SpacesSetupController] Creando tipo de espacio para building ${buildingId}:`, createSpaceTypeDto);
      console.log(`[SpacesSetupController] Usuario:`, req.user);
      
      // Verificar si el building existe
      const building = await this.prisma.building.findUnique({
        where: { id: buildingId },
        select: { schema: true }
      });
      
      if (!building) {
        console.error(`[SpacesSetupController] Building con ID ${buildingId} no encontrado`);
        return {
          error: true,
          message: `Building con ID ${buildingId} no encontrado`,
          status: 404
        };
      }
      
      console.log(`[SpacesSetupController] Building encontrado con schema: ${building.schema}`);
      
      // Verificar y crear las tablas si no existen
      const tablesExist = await this.spacesSchemaService.checkSpaceTablesExist(building.schema);
      if (!tablesExist) {
        console.log(`[SpacesSetupController] Las tablas no existen. Creándolas...`);
        await this.spacesSchemaService.ensureSpaceTablesExist(buildingId);
        console.log(`[SpacesSetupController] Tablas creadas.`);
      }
      
      // Crear el tipo de espacio
      console.log(`[SpacesSetupController] Llamando a spacesService.createSpaceType`);
      const result = await this.spacesService.createSpaceType(buildingId, createSpaceTypeDto);
      console.log(`[SpacesSetupController] Resultado de creación de tipo de espacio:`, result);
      return result;
    } catch (error) {
      console.error(`[SpacesSetupController] Error al crear tipo de espacio:`, error);
      return {
        error: true,
        message: `Error al crear tipo de espacio: ${error.message}`,
        details: error.stack
      };
    }
  }

  /**
   * Lista todos los tipos de espacios (endpoint sin restricciones de rol)
   */
  @Get('list-space-types')
  async listSpaceTypes(@Param('buildingId') buildingId: string) {
    try {
      console.log(`[SpacesSetupController] Listando tipos de espacios para building ${buildingId}`);
      
      // Verificar si el building existe
      const building = await this.prisma.building.findUnique({
        where: { id: buildingId },
        select: { schema: true }
      });
      
      if (!building) {
        console.error(`[SpacesSetupController] Building con ID ${buildingId} no encontrado`);
        return {
          error: true,
          message: `Building con ID ${buildingId} no encontrado`,
          status: 404
        };
      }
      
      // Asegurarse de que las tablas existan
      const tablesExist = await this.spacesSchemaService.checkSpaceTablesExist(building.schema);
      if (!tablesExist) {
        console.log(`[SpacesSetupController] Las tablas no existen. Creándolas...`);
        await this.spacesSchemaService.ensureSpaceTablesExist(buildingId);
        console.log(`[SpacesSetupController] Tablas creadas.`);
      }
      
      // Obtener todos los tipos de espacio
      return await this.spacesService.findAllSpaceTypes(buildingId);
    } catch (error) {
      console.error(`[SpacesSetupController] Error al listar tipos de espacios:`, error);
      return {
        error: true,
        message: `Error al listar tipos de espacios: ${error.message}`
      };
    }
  }

  /**
   * Genera unidades (endpoint sin restricciones de rol)
   */
  @Post('generate-units')
  async generateUnits(
    @Param('buildingId') buildingId: string,
    @Body() generateUnitsDto: GenerateUnitsDto,
    @Request() req
  ) {
    try {
      console.log(`[SpacesSetupController] Generando unidades para building ${buildingId}:`, generateUnitsDto);
      console.log(`[SpacesSetupController] Usuario:`, req.user);
      
      // Verificar si el building existe
      const building = await this.prisma.building.findUnique({
        where: { id: buildingId },
        select: { schema: true }
      });
      
      if (!building) {
        console.error(`[SpacesSetupController] Building con ID ${buildingId} no encontrado`);
        return {
          error: true,
          message: `Building con ID ${buildingId} no encontrado`,
          status: 404
        };
      }
      
      console.log(`[SpacesSetupController] Building encontrado con schema: ${building.schema}`);
      
      // Verificar y crear tablas si no existen
      const tablesExist = await this.spacesSchemaService.checkSpaceTablesExist(building.schema);
      if (!tablesExist) {
        console.log(`[SpacesSetupController] Las tablas no existen. Creándolas...`);
        await this.spacesSchemaService.ensureSpaceTablesExist(buildingId);
        console.log(`[SpacesSetupController] Tablas creadas.`);
      }
      
      // Generar unidades
      console.log(`[SpacesSetupController] Llamando a spacesService.generateUnits con:`, generateUnitsDto);
      const result = await this.spacesService.generateUnits(buildingId, generateUnitsDto);
      console.log(`[SpacesSetupController] Resultado de generación de unidades:`, result);
      return result;
    } catch (error) {
      console.error(`[SpacesSetupController] Error al generar unidades:`, error);
      return {
        error: true,
        message: `Error al generar unidades: ${error.message}`,
        details: error.stack
      };
    }
  }
}
