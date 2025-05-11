import { Controller, Post, Body, Param, Delete, Get, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappStatus, N8nFlowStatus } from '@prisma/client';
import { WhatsAppService } from './whatsapp.service';

@ApiTags('buildings/whatsapp')
@Controller('buildings/whatsapp')
export class WhatsAppController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsAppService,
  ) {}

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

  @Post(':buildingId')
  @ApiOperation({ summary: 'Create WhatsApp instance for building' })
  @ApiResponse({ status: 201, description: 'WhatsApp instance created' })
  async createInstance(@Param('buildingId') buildingId: string) {
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

  @Get(':buildingId')
  @ApiOperation({ summary: 'Get WhatsApp instance for building' })
  @ApiResponse({ status: 200, description: 'WhatsApp instance found' })
  async getInstance(@Param('buildingId') buildingId: string) {
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
}
