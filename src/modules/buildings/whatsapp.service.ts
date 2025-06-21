import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { N8nWebhookService } from '../n8n/n8n-webhook.service';
import { WhatsappStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';

interface WhatsAppWebhookResponse {
  success: boolean;
  timestamp?: string;
  error?: {
    type: string;
    status: number;
    message: string;
    missingProperties?: string[];
    originalError?: string;
    details?: string;
    code?: string;
  };
}

interface WhatsAppErrorDetails {
  type: string;
  status: number;
  message: string;
  missingProperties: string[];
  originalError: string | null;
  details: string | null;
  code: string;
}

@Injectable()
export class WhatsAppService {
  async updateInstanceStatusByName(instanceName: string, state: string) {
    console.log(`=== Actualizando estado de instancia ${instanceName} a ${state} ===`);

    try {
      // Buscar la instancia por nombre
      const instance = await this.prisma.buildingWhatsapp.findFirst({
        where: { instanceName }
      });

      if (!instance) {
        throw new Error(`No se encontró la instancia ${instanceName}`);
      }

      // Mapear el estado de Evolution API a nuestro enum
      let status: WhatsappStatus;
      switch (state) {
        case 'open':
          status = 'CONNECTED' as WhatsappStatus;
          break;
        case 'close':
          status = 'DISCONNECTED' as WhatsappStatus;
          break;
        case 'connecting':
          status = 'CONNECTING' as WhatsappStatus;
          break;
        default:
          status = 'FAILED' as WhatsappStatus;
      }

      // Actualizar el estado
      const updateData: Prisma.BuildingWhatsappUpdateInput = {
        status,
        evolutionApiStatus: state,
        ...(state === 'open' && { lastConnection: new Date() })
      };

      const result = await this.prisma.buildingWhatsapp.update({
        where: { id: instance.id },
        data: updateData
      });

      console.log('Estado actualizado:', result);
      return result;
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      throw error;
    }
  }
  async getInstanceConnectionStatus(buildingId: string) {
    const instance = await this.prisma.buildingWhatsapp.findFirst({
      where: { buildingId },
      select: {
        id: true,
        buildingId: true,
        instanceName: true,
        status: true,
        evolutionApiStatus: true,
        updatedAt: true
      }
    });

    if (!instance) {
      return null;
    }

    try {
      // Obtener el webhook de estado
      const webhookUrl = await this.n8nWebhookService.getWebhookUrl('whatsapp_get_status');

      // Llamar al webhook de n8n para obtener el estado real de Evolution API
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          buildingId,
          instanceName: instance.instanceName,
        }),
      });

      if (!response.ok) {
        return {
          ...instance,
          status: 'DISCONNECTED',
          evolutionApiStatus: 'Error al consultar estado'
        };
      }

      const data = await response.json();

      return {
        ...instance,
        status: data.data.connectionStatus === 'open' ? 'CONNECTED' : 'DISCONNECTED',
        evolutionApiStatus: data.data.connectionStatus || null
      };
    } catch (error) {
      console.error('Error al consultar el estado:', error);
      return {
        ...instance,
        status: 'DISCONNECTED',
        evolutionApiStatus: 'Error al consultar estado'
      };
    }
  }
  constructor(
    private prisma: PrismaService,
    private n8nWebhookService: N8nWebhookService,
  ) {}

  async getInstanceStatus(buildingId: string) {
    console.log(`=== Buscando instancia de WhatsApp para el building ${buildingId} ===`);

    // Buscar la instancia en la base de datos
    const instance = await this.prisma.buildingWhatsapp.findFirst({
      where: { buildingId }
    });

    if (!instance) {
      console.log('No se encontró instancia');
      return null;
    }

    console.log('Instancia encontrada en DB:', instance);

    try {
      // Obtener el webhook de estado
      const webhookUrl = await this.n8nWebhookService.getWebhookUrl('whatsapp_get_status');
      console.log('Webhook URL:', webhookUrl);

      // Llamar al webhook de n8n para obtener el estado real de Evolution API
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          buildingId,
          instanceName: instance.instanceName,
        }),
      });

      if (!response.ok) {
        console.error('Error al obtener el estado de n8n:', response.statusText);
        return {
          ...instance,
          status: 'DISCONNECTED',
          evolutionApiStatus: 'Error al consultar estado'
        };
      }

      const data = await response.json();
      console.log('Estado de Evolution API:', data);

      // Devolver la instancia con el estado actualizado de Evolution API
      return {
        ...instance,
        status: data.data.connectionStatus === 'open' ? 'CONNECTED' : 'DISCONNECTED',
        evolutionApiStatus: data.data.connectionStatus || null
      };
    } catch (error) {
      console.error('Error al consultar el estado:', error);
      // Si hay error al consultar el estado, devolvemos la instancia con estado desconectado
      return {
        ...instance,
        status: 'DISCONNECTED',
        evolutionApiStatus: 'Error al consultar estado'
      };
    }
  }

  async disconnectInstance(buildingId: string) {
    console.log('=== Eliminando instancia de WhatsApp ===');
    const instance = await this.prisma.buildingWhatsapp.findFirst({
      where: { buildingId }
    });

    if (!instance) {
      console.log('No se encontró instancia para eliminar');
      return null;
    }

    console.log('Instancia encontrada:', instance);

    try {
      // Eliminar la instancia de la base de datos
      const deletedInstance = await this.prisma.buildingWhatsapp.delete({
        where: { id: instance.id },
      });

      console.log('Instancia eliminada de la base de datos:', deletedInstance);
      return deletedInstance;
    } catch (error) {
      console.error('Error al eliminar la instancia:', error);
      throw new Error(`Error al eliminar la instancia de WhatsApp: ${error.message}`);
    }
  }

  async sendTextMessage(buildingId: string, to: string, message: string): Promise<void> {
    const instance = await this.prisma.buildingWhatsapp.findFirst({
      where: { buildingId }
    });

    if (!instance) {
      throw new Error('WhatsApp instance not found');
    }

    const webhookUrl = await this.n8nWebhookService.getWebhookUrl('whatsapp_send_message');

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instanceName: instance.instanceName,
        whatsappOwner: to,
        invitationMessage: message
      }),
    });

    const responseData = await response.json() as WhatsAppWebhookResponse;
    console.log('WhatsApp webhook response:', JSON.stringify(responseData, null, 2));

    if (!responseData.success) {
      // Extraer detalles del error
      const errorData = responseData.error;
      let errorMessage = 'Error al enviar mensaje de WhatsApp';
      let errorDetails: WhatsAppErrorDetails = {
        type: 'UNKNOWN_ERROR',
        status: 500,
        message: errorMessage,
        missingProperties: [],
        originalError: null,
        details: null,
        code: 'ERR_UNKNOWN'
      };

      if (errorData) {
        // Buscar propiedades faltantes en los detalles
        const missingProps: string[] = [];
        const patterns = [
          /property "(\w+)"/g,
          /requires property "(\w+)"/g,
          /instance requires property "(\w+)"/g
        ];

        if (errorData.details) {
          patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(errorData.details || '')) !== null) {
              if (match[1] && !missingProps.includes(match[1])) {
                missingProps.push(match[1]);
              }
            }
          });
        }

        errorDetails = {
          type: errorData.type || 'UNKNOWN_ERROR',
          status: errorData.status || 500,
          message: errorData.message || errorMessage,
          missingProperties: missingProps,
          originalError: errorData.originalError || null,
          details: errorData.details || null,
          code: errorData.code || 'ERR_UNKNOWN'
        };

        errorMessage = `${errorDetails.message}${missingProps.length ? `: Faltan campos requeridos (${missingProps.join(', ')})` : ''}`;
      }

      throw new Error(errorMessage);
    }
  }

  async createInstance(buildingId: string) {
    // Obtener el edificio
    const building = await this.prisma.building.findUnique({
      where: { id: buildingId },
      include: { whatsappInstance: true },
    });

    if (!building) {
      throw new NotFoundException(`Building with ID ${buildingId} not found`);
    }

    // Si ya existe una instancia, retornarla
    if (building.whatsappInstance) {
      return building.whatsappInstance;
    }

    // Obtener el webhook de creación de instancia
    const webhookUrl = await this.n8nWebhookService.getWebhookUrl('whatsapp_create_instance');

    // Crear la instancia en la base de datos
    const whatsappInstance = await this.prisma.buildingWhatsapp.create({
      data: {
        buildingId,
        instanceName: `${building.name} - ${buildingId}`,
        status: 'DISCONNECTED',
        n8nFlowStatus: 'PENDING',
      },
    });

    // Llamar al webhook de n8n
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        buildingId,
        instanceName: whatsappInstance.instanceName,
      }),
    });

    if (!response.ok) {
      // Si hay error, actualizar el estado y propagar el error
      await this.prisma.buildingWhatsapp.update({
        where: { id: whatsappInstance.id },
        data: {
          n8nFlowStatus: 'FAILED',
          lastError: `Error creating instance: ${response.statusText}`,
        },
      });

      throw new Error(`Failed to create WhatsApp instance: ${response.statusText}`);
    }

    const data = await response.json();

    // Actualizar la instancia con la respuesta de n8n
    return this.prisma.buildingWhatsapp.update({
      where: { id: whatsappInstance.id },
      data: {
        n8nFlowStatus: 'COMPLETED',
        instanceId: data.instanceId,
      },
    });
  }
}
