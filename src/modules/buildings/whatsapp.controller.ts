import { Controller, Post, Body, Param, Delete, Get, Patch, HttpCode } from '@nestjs/common';
import { Public } from '../../decorators/public.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappStatus, N8nFlowStatus } from '@prisma/client';
import { WhatsAppService } from './whatsapp.service';
import { UpdateWhatsappStatusDto } from './dto/update-whatsapp-status.dto';

@ApiTags('buildings/whatsapp')
@Controller('buildings/whatsapp')
export class WhatsAppController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsAppService,
  ) {}

  @Get('/exists/:buildingId')
  @ApiParam({ 
    name: 'buildingId', 
    type: 'string', 
    required: true, 
    description: 'ID del edificio' 
  })
  @ApiOperation({ 
    summary: 'Check if WhatsApp instance exists for building',
    description: 'Comprueba rápidamente si existe una instancia de WhatsApp para el edificio, sin obtener detalles ni estado'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Verificación de existencia realizada exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: { 
          type: 'object', 
          properties: { 
            exists: { type: 'boolean', example: true } 
          } 
        },
        message: { type: 'string', example: 'Existe una instancia para este edificio' }
      }
    }
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Error al verificar la existencia de la instancia',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: { type: 'string' },
        message: { type: 'string', example: 'Error al verificar existencia de instancia de WhatsApp' }
      }
    }
  })
  async instanceExists(@Param('buildingId') buildingId: string) {
    console.log(`=== Verificando existencia de instancia para el edificio ${buildingId} ===`);

    try {
      const result = await this.whatsappService.instanceExists(buildingId);
      return {
        success: true,
        data: result,
        message: result.exists ? 'Existe una instancia para este edificio' : 'No hay instancia configurada'
      };
    } catch (error) {
      console.error('Error al verificar existencia de instancia:', error);
      return {
        success: false,
        error: error.message,
        message: 'Error al verificar existencia de instancia de WhatsApp'
      };
    }
  }

  @Get('/status/:buildingId')
  @ApiOperation({ 
    summary: 'Get WhatsApp instance with real-time status',
    description: 'Obtiene los datos completos de la instancia de WhatsApp incluyendo su estado en tiempo real desde Evolution API via webhook'
  })
  @ApiParam({
    name: 'buildingId',
    required: true,
    description: 'ID del edificio para obtener la instancia WhatsApp con estado en tiempo real'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Instancia WhatsApp encontrada con estado en tiempo real',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: { 
          type: 'object',
          properties: {
            id: { type: 'string' },
            buildingId: { type: 'string' },
            instanceId: { type: 'string' },
            instanceName: { type: 'string' },
            status: { type: 'string', enum: ['CONNECTED', 'DISCONNECTED', 'CONNECTING'] },
            n8nFlowStatus: { type: 'string' },
            evolutionApiStatus: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          } 
        },
        message: { type: 'string', example: 'Instancia encontrada' }
      }
    }
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Error al buscar la instancia con su estado',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: { type: 'string' },
        message: { type: 'string', example: 'Error al buscar la instancia de WhatsApp' }
      }
    }
  })
  async getInstanceWithStatus(@Param('buildingId') buildingId: string) {
    console.log(`=== Buscando instancia de WhatsApp para el edificio ${buildingId} ===`);

    try {
      const result = await this.whatsappService.getInstanceStatus(buildingId);

      console.log('Instancia encontrada:', result);
      
      // Siempre devolver un objeto JSON
      return {
        success: true,
        data: result,
        message: result ? 'Instancia encontrada' : 'No hay instancia configurada'
      };
    } catch (error) {
      console.error('Error al buscar la instancia:', error);
      return {
        success: false,
        error: error.message,
        message: 'Error al buscar la instancia de WhatsApp'
      };
    }
  }
  
  @Get('/connection-status/:buildingId')
  @ApiParam({ 
    name: 'buildingId', 
    type: 'string', 
    required: true, 
    description: 'ID del edificio' 
  })
  @ApiOperation({ 
    summary: 'Get WhatsApp instance connection status',
    description: 'Obtiene solamente el estado de conexión de la instancia de WhatsApp'
  })
  @ApiParam({
    name: 'buildingId',
    required: true,
    description: 'ID del edificio para obtener el estado de conexión de la instancia WhatsApp'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Estado de conexión de la instancia obtenido correctamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: { 
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['CONNECTED', 'DISCONNECTED', 'CONNECTING'] },
            evolutionApiStatus: { type: 'string' }
          }
        },
        message: { type: 'string', example: 'Estado de la instancia obtenido' }
      }
    }
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Error al obtener el estado de la instancia',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: { type: 'string' },
        message: { type: 'string', example: 'Error al obtener el estado de la instancia de WhatsApp' }
      }
    }
  })
  async getConnectionStatus(@Param('buildingId') buildingId: string) {
    try {
      const result = await this.whatsappService.getInstanceConnectionStatus(buildingId);
      
      return {
        success: true,
        data: result,
        message: result ? 'Estado de la instancia obtenido' : 'No hay instancia configurada'
      };
    } catch (error) {
      console.error('Error al obtener el estado de la instancia:', error);
      return {
        success: false,
        error: error.message,
        message: 'Error al obtener el estado de la instancia de WhatsApp'
      };
    }
  }

  @Post(':buildingId')
  @ApiOperation({ summary: 'Create WhatsApp instance for building' })
  @ApiResponse({ status: 201, description: 'WhatsApp instance created' })
  async createInstance(@Param('buildingId') buildingId: string) {
    console.log(`======= ENDPOINT CREATE INSTANCE LLAMADO DESDE CONTROLLER PARA BUILDING: ${buildingId} ========`);
    try {
      const result = await this.whatsappService.createInstance(buildingId);
      return {
        success: true,
        data: result,
        message: 'Instancia de WhatsApp creada correctamente'
      };
    } catch (error) {
      console.error('Error al crear la instancia:', error);
      return {
        success: false,
        error: error.message,
        message: 'Error al crear la instancia de WhatsApp'
      };
    }
  }

  @Patch(':buildingId')
  @ApiOperation({ summary: 'Update WhatsApp instance for building' })
  @ApiResponse({ status: 200, description: 'WhatsApp instance updated' })
  async updateInstance(
    @Param('buildingId') buildingId: string,
    @Body() data: Partial<{
      instanceId: string;
      instanceName: string;
      status: WhatsappStatus;
      n8nFlowStatus: N8nFlowStatus;
      evolutionApiStatus: string;
    }>
  ) {
    console.log('=== Actualizando instancia de WhatsApp ===');
    console.log('Building ID:', buildingId);
    console.log('Datos:', data);

    try {
      const instance = await this.prisma.buildingWhatsapp.findFirst({
        where: { buildingId }
      });

      if (!instance) {
        throw new Error('Instancia no encontrada');
      }

      const result = await this.prisma.buildingWhatsapp.update({
        where: { id: instance.id },
        data
      });

      console.log('Instancia actualizada:', result);
      return {
        success: true,
        data: result,
        message: 'Instancia actualizada correctamente'
      };
    } catch (error) {
      console.error('Error al actualizar la instancia:', error);
      return {
        success: false,
        error: error.message,
        message: 'Error al actualizar la instancia de WhatsApp'
      };
    }
  }

  @Delete(':buildingId')
  @ApiOperation({ summary: 'Delete WhatsApp instance for building' })
  @ApiResponse({ status: 200, description: 'WhatsApp instance deleted' })
  async deleteInstance(@Param('buildingId') buildingId: string) {
    try {
      const result = await this.whatsappService.disconnectInstance(buildingId);
      return {
        success: true,
        data: result,
        message: 'Instancia desconectada correctamente'
      };
    } catch (error) {
      console.error('Error al desconectar la instancia:', error);
      return {
        success: false,
        error: error.message,
        message: 'Error al desconectar la instancia de WhatsApp'
      };
    }
  }

  @Post(':instanceName/status')
  @Public()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Update WhatsApp instance status by instance name',
    description: 'Endpoint para recibir actualizaciones de estado desde Evolution API a través de n8n. Maneja los estados: connecting, open (conectado), close (desconectado).'
  })
  @ApiResponse({ status: 200, description: 'WhatsApp instance status updated successfully' })
  @ApiResponse({ status: 404, description: 'WhatsApp instance not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async updateInstanceStatus(
    @Param('instanceName') instanceName: string,
    @Body() data: UpdateWhatsappStatusDto
  ) {
    try {
      const result = await this.whatsappService.updateInstanceStatusByName(instanceName, data.data.state);
      return {
        success: true,
        data: result,
        message: 'Estado de la instancia actualizado correctamente'
      };
    } catch (error) {
      console.error('Error al actualizar el estado de la instancia:', error);
      return {
        success: false,
        error: error.message,
        message: 'Error al actualizar el estado de la instancia de WhatsApp'
      };
    }
  }

  @Get(':buildingId')
  @ApiOperation({ 
    summary: 'Get basic WhatsApp instance data for building',
    description: 'Obtiene los datos básicos de la instancia de WhatsApp sin consultar su estado en tiempo real'
  })
  @ApiParam({
    name: 'buildingId',
    required: true,
    description: 'ID del edificio para obtener datos de la instancia WhatsApp'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Datos básicos de la instancia WhatsApp encontrados',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: { 
          type: 'object',
          properties: {
            id: { type: 'string' },
            buildingId: { type: 'string' },
            instanceId: { type: 'string' },
            instanceName: { type: 'string' },
            status: { type: 'string', enum: ['CONNECTED', 'DISCONNECTED', 'CONNECTING'] },
            n8nFlowStatus: { type: 'string' },
            evolutionApiStatus: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          } 
        },
        message: { type: 'string', example: 'Instancia encontrada' }
      }
    }
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Error al obtener la instancia',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: { type: 'string' },
        message: { type: 'string', example: 'Error al obtener instancia de WhatsApp' }
      }
    }
  })
  async getInstance(@Param('buildingId') buildingId: string) {
    console.log(`=== Obteniendo datos básicos de instancia para ${buildingId} ===`);

    try {
      const result = await this.whatsappService.getInstance(buildingId);
      return {
        success: true,
        data: result,
        message: result ? 'Instancia encontrada' : 'No hay instancia configurada'
      };
    } catch (error) {
      console.error('Error al obtener instancia:', error);
      return {
        success: false,
        error: error.message,
        message: 'Error al obtener instancia de WhatsApp'
      };
    }
  }
}
