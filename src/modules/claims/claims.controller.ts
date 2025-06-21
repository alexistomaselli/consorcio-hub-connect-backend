import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
  Delete,
  Query,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam, 
  ApiBearerAuth, 
  ApiBody 
} from '@nestjs/swagger';
import { ClaimsService } from './claims.service';
import { CreateClaimDto } from './dto/create-claim.dto';
import { UpdateClaimDto } from './dto/update-claim.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ClaimsSchemaService } from './claims-schema.service';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('claims')
@ApiBearerAuth()
@Controller('buildings/:buildingId/claims')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClaimsController {
  constructor(
    private readonly claimsService: ClaimsService,
    private readonly claimsSchemaService: ClaimsSchemaService,
    private readonly prisma: PrismaService
  ) {}
  
  // Endpoint simple para probar si se registra correctamente el controlador
  @Get('ping')
  @ApiOperation({ summary: 'Endpoint de prueba para verificar que el controlador funciona' })
  @ApiResponse({ status: 200, description: 'Controlador funcionando correctamente' })
  async ping() {
    console.log('ClaimsController ping endpoint llamado!');
    return { message: 'Claims controller is working!' };
  }
  
  // -------------------- Setup Tables --------------------

  @Get('check-tables')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.BUILDING_ADMIN, UserRole.OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Verificar si las tablas de reclamos están configuradas' })
  @ApiParam({ name: 'buildingId', type: 'string', description: 'ID del edificio' })
  @ApiResponse({ status: 200, description: 'Información sobre el estado de las tablas' })
  async checkTables(@Param('buildingId') buildingId: string) {
    try {
      console.log(`[ClaimsController] Verificando tablas para building: ${buildingId}`);
      
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
      const tablesExist = await this.claimsSchemaService.checkClaimTablesExist(building.schema);
      
      return {
        setup_required: !tablesExist,
        message: tablesExist ? 'Las tablas ya existen' : 'Se requiere configurar las tablas'
      };
    } catch (error) {
      console.error(`[ClaimsController] Error al verificar tablas:`, error);
      return {
        error: true,
        message: `Error al verificar tablas: ${error.message}`,
        setup_required: true
      };
    }
  }

  @Post('setup-tables')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.BUILDING_ADMIN, UserRole.OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Configurar las tablas de reclamos para un edificio' })
  @ApiParam({ name: 'buildingId', type: 'string', description: 'ID del edificio' })
  @ApiResponse({ status: 200, description: 'Tablas configuradas correctamente' })
  @ApiResponse({ status: 400, description: 'Error al configurar las tablas' })
  async setupTables(@Param('buildingId') buildingId: string, @Request() req) {
    try {
      console.log(`[ClaimsController] Iniciando configuración de tablas para building: ${buildingId}`);
      console.log('[ClaimsController] Usuario actual:', req.user);
      const result = await this.claimsSchemaService.ensureClaimTablesExist(buildingId);
      
      console.log(`[ClaimsController] Resultado de configuración: ${result}`);
      return {
        success: result,
        message: 'Tablas de reclamos configuradas correctamente'
      };
    } catch (error) {
      console.error(`[ClaimsController] Error al configurar tablas de reclamos:`, error);
      // Devolver un error más detallado pero sin exponer detalles sensibles
      return {
        success: false,
        message: `Error al configurar tablas de reclamos: ${error.message}`
      };
    }
  }

  @Post()
  @ApiOperation({ summary: 'Create a new claim' })
  @ApiResponse({ status: 201, description: 'The claim has been successfully created' })
  @ApiParam({ name: 'buildingId', description: 'Building ID' })
  @Roles(UserRole.BUILDING_ADMIN, UserRole.OWNER)
  create(
    @Param('buildingId') buildingId: string,
    @Request() req,
    @Body() createClaimDto: CreateClaimDto,
  ) {
    console.log('[ClaimsController] User object:', req.user);
    return this.claimsService.create(buildingId, req.user.sub, createClaimDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get claims for a building, optionally filtered by owner' })
  @ApiResponse({ status: 200, description: 'Returns claims according to filters and user role' })
  @ApiParam({ name: 'buildingId', description: 'Building ID' })
  @Roles(UserRole.BUILDING_ADMIN, UserRole.OWNER)
  findAll(
    @Param('buildingId') buildingId: string,
    @Request() req,
    @Query('onlyOwn') onlyOwn: boolean = false
  ) {
    const userId = req.user.sub;
    const userRole = req.user.role;
    
    // Si es OWNER y se solicita onlyOwn, o si es BUILDING_ADMIN pero igual se solicita onlyOwn
    const filterByOwner = onlyOwn === true;
    
    console.log(`[ClaimsController] Buscando reclamos para: buildingId=${buildingId}, userId=${userId}, rol=${userRole}, soloPropio=${filterByOwner}`);
    return this.claimsService.findAll(buildingId, userId, userRole, filterByOwner);
  }
  
  @Get('my-claims')
  @ApiOperation({ summary: 'Get claims created by the current owner (legacy endpoint)' })
  @ApiResponse({ status: 200, description: 'Returns all claims created by the current owner' })
  @ApiParam({ name: 'buildingId', description: 'Building ID' })
  @Roles(UserRole.OWNER)
  findMyClaims(
    @Param('buildingId') buildingId: string,
    @Request() req
  ) {
    const userId = req.user.sub;
    const userRole = req.user.role;
    console.log(`[ClaimsController] Redirigiendo a endpoint unificado con filtro onlyOwn=true`);
    // Mantener el endpoint por compatibilidad, pero usar la misma lógica unificada
    return this.claimsService.findAll(buildingId, userId, userRole, true);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific claim' })
  @ApiResponse({ status: 200, description: 'Returns the claim with the specified ID' })
  @ApiParam({ name: 'buildingId', description: 'Building ID' })
  @ApiParam({ name: 'id', description: 'Claim ID' })
  @Roles(UserRole.BUILDING_ADMIN, UserRole.OWNER)
  findOne(@Param('buildingId') buildingId: string, @Param('id') id: string) {
    return this.claimsService.findById(buildingId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a claim' })
  @ApiResponse({ status: 200, description: 'Returns the updated claim' })
  @ApiParam({ name: 'buildingId', description: 'Building ID' })
  @ApiParam({ name: 'id', description: 'Claim ID' })
  @Roles(UserRole.BUILDING_ADMIN, UserRole.OWNER)
  update(
    @Param('buildingId') buildingId: string,
    @Param('id') id: string,
    @Body() updateClaimDto: UpdateClaimDto,
  ) {
    return this.claimsService.update(buildingId, id, updateClaimDto);
  }

  @Post(':id/comments')
  @Roles(UserRole.BUILDING_ADMIN, UserRole.OWNER)
  addComment(
    @Param('buildingId') buildingId: string,
    @Param('id') id: string,
    @Request() req,
    @Body('content') content: string,
  ) {
    return this.claimsService.addComment(buildingId, id, req.user.id, content);
  }
  
  @Delete(':id')
  @Roles(UserRole.BUILDING_ADMIN, UserRole.OWNER)
  remove(
    @Param('buildingId') buildingId: string,
    @Param('id') id: string,
    @Request() req,
  ) {
    console.log(`[ClaimsController] Usuario que intenta eliminar:`, req.user);
    
    // Usar req.user.sub que es donde el JWT guarda el ID del usuario
    return this.claimsService.remove(buildingId, id, req.user.sub, req.user.role);
  }
}
