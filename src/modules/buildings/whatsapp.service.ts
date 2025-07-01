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

  async instanceExists(buildingId: string) {
    // Verificar si existe una instancia para el edificio (consulta rápida)
    const count = await this.prisma.buildingWhatsapp.count({
      where: { buildingId }
    });
    return { exists: count > 0 };
  }

  async getInstance(buildingId: string) {
    // Obtener los datos básicos de la instancia sin consultar su estado en tiempo real
    const instance = await this.prisma.buildingWhatsapp.findFirst({
      where: { buildingId }
    });
    return instance;
  }

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
    console.log(`
=========================================================================
======= MÉTODO CREATE INSTANCE INICIADO PARA BUILDING: ${buildingId} =======
=========================================================================
`);
    
    // Obtener el edificio
    console.log(`[1] Buscando edificio con ID: ${buildingId}`);
    const building = await this.prisma.building.findUnique({
      where: { id: buildingId },
      include: { whatsappInstance: true },
    });

    if (!building) {
      console.error(`[X] Edificio no encontrado con ID: ${buildingId}`);
      throw new NotFoundException(`Building with ID ${buildingId} not found`);
    }
    //console.log(`[✓] Edificio encontrado: ${building.name}`);

    // Si ya existe una instancia, retornarla
    if (building.whatsappInstance) {
      console.log(`[!] Ya existe una instancia para este edificio:`, building.whatsappInstance);
      return building.whatsappInstance;
    }
    console.log(`[✓] No existe instancia previa, procediendo a crear una nueva`);

    try {
      // Obtener el webhook de creación de instancia
      const webhookName = 'whatsapp_create_instance';
      console.log(`[2] Obteniendo webhook ${webhookName}...`);
      const webhookUrl = await this.n8nWebhookService.getWebhookUrl(webhookName);
      
      // Mostrar la URL exacta caracter por caracter para detectar espacios o caracteres invisibles
      console.log(`[✓] Webhook URL obtenida: ${webhookUrl}`);
      console.log(`[✓] Longitud URL: ${webhookUrl.length} caracteres`);
      console.log(`[✓] URL como array de caracteres:`, JSON.stringify([...webhookUrl].map(c => c.charCodeAt(0))));
      console.log(`[✓] URL para comparación manual: "${webhookUrl}"`);
      
      // Para comparar con una URL conocida que funciona
      const urlReferencia = 'https://dn8nwebhookd.dydialabs.tech/webhook/e55e6aa1-b8e4-4c70-966b-a57dc5a99568';
      console.log(`[✓] ¿URL coincide con referencia?: ${webhookUrl === urlReferencia}`);
      if (webhookUrl !== urlReferencia) {
        console.log(`[✓] Diferencias: ${[...webhookUrl].map((c, i) => c !== urlReferencia[i] ? `Pos ${i}: ${c}(${c.charCodeAt(0)}) vs ${urlReferencia[i]}(${urlReferencia[i]?.charCodeAt(0)})` : null).filter(Boolean)}`);
      }

      // Crear la instancia en la base de datos
      console.log(`[3] Creando instancia en la base de datos para el edificio ${buildingId}...`);
      const whatsappInstance = await this.prisma.buildingWhatsapp.create({
        data: {
          buildingId,
          instanceName: `${building.name} - ${buildingId}`,
          status: 'DISCONNECTED',
          n8nFlowStatus: 'PENDING',
        },
      });
      console.log(`[✓] Instancia creada en la base de datos con ID: ${whatsappInstance.id}`);

      // Preparar los datos para enviar al webhook con exactamente la misma estructura que el script de prueba
      const webhookData = {
        buildingId,
        instanceName: whatsappInstance.instanceName,
      };
      console.log(`[4] Preparando llamada al webhook con datos:`, JSON.stringify(webhookData, null, 2));

      console.log(`[5] PROBANDO NUEVA IMPLEMENTACIÓN: Llamada directa con curl al webhook: ${webhookUrl}`);
      
      try {
        // Importar child_process para ejecutar curl directamente
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execPromise = promisify(exec);
        
        // Preparar el comando curl con los datos a enviar
        const curlCommand = `curl -X POST "${webhookUrl}" -H "Content-Type: application/json" -d '${JSON.stringify(webhookData)}' --max-time 15`;
        console.log(`[5.1] Comando curl a ejecutar: ${curlCommand}`);
        
        // Ejecutar curl como proceso hijo
        console.log('[5.2] Ejecutando comando curl...');
        const { stdout, stderr } = await execPromise(curlCommand);
        
        if (stderr) {
          console.error(`[!] Advertencia de curl: ${stderr}`);
        }
        
        console.log(`[✓] Respuesta de curl: ${stdout}`);
        
        // Parsear la respuesta JSON
        const response = { data: JSON.parse(stdout), status: 200 };
        console.log(`[✓] Respuesta parseada: ${JSON.stringify(response.data)}`);
        
        console.log(`[✓] Respuesta recibida del webhook. Status: ${response.status}`);
        console.log(`Respuesta completa:`, JSON.stringify(response.data, null, 2));
        
        // Actualizar la instancia con la respuesta de n8n si tiene instanceId
        const responseData = response.data as { instanceId?: string, success?: boolean };
        
        if (responseData?.instanceId) {
          console.log(`[6] Actualizando instancia ${whatsappInstance.id} con instanceId ${responseData.instanceId}`);
          return this.prisma.buildingWhatsapp.update({
            where: { id: whatsappInstance.id },
            data: {
              n8nFlowStatus: 'COMPLETED',
              instanceId: responseData.instanceId,
            },
          });
        }
        
        return whatsappInstance;
      } catch (requestError) {
        // Utilizar exactamente el mismo manejo de errores que el script de prueba
        console.error('❌ Error al hacer la solicitud al webhook:');
        
        if (requestError.response) {
          // La petición fue hecha y el servidor respondió con un código de estado que no está en el rango 2xx
          console.error(`  Status: ${requestError.response.status}`);
          console.error(`  Headers: ${JSON.stringify(requestError.response.headers)}`);
          console.error(`  Datos: ${JSON.stringify(requestError.response.data)}`);
        } else if (requestError.request) {
          // La petición fue hecha pero no se recibió ninguna respuesta
          console.error('  No se recibió ninguna respuesta del servidor');
          console.error(`  Detalles: ${requestError.message}`);
        } else {
          // Algo sucedió en la configuración de la petición y provocó un error
          console.error(`  Error: ${requestError.message}`);
        }
        
        // Si hay error, actualizar el estado pero no fallar la operación si estamos en desarrollo
        await this.prisma.buildingWhatsapp.update({
          where: { id: whatsappInstance.id },
          data: {
            n8nFlowStatus: 'FAILED',
            lastError: `Error calling webhook: ${requestError.message}`,
          },
        });
        
        // En desarrollo, continuamos a pesar del error del webhook
        if (process.env.NODE_ENV === 'development') {
          console.warn('[!] Continuando en modo desarrollo a pesar del error del webhook');
          return whatsappInstance;
        }
        
        throw new Error(`[X] Error al llamar al webhook: ${requestError.message}`);
      }
    } catch (error) {
      console.error(`Error al crear instancia: ${error.message}`);
      throw error;
    }
  }
}
