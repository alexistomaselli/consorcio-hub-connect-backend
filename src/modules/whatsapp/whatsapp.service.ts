import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WhatsappService {
  constructor(private prisma: PrismaService) {}

  async sendMessage(to: string, message: string, buildingId?: string): Promise<void> {
    if (buildingId) {
      await this.sendBuildingMessage(buildingId, to, message);
    } else {
      // Para mensajes que no requieren una instancia específica (ej: invitaciones)
      // Por ahora solo logueamos, pero aquí iría la lógica para usar una instancia default
      console.log(`Sending WhatsApp message to ${to}: ${message}`);
    }
  }

  private async sendBuildingMessage(buildingId: string, to: string, message: string): Promise<void> {
    const instance = await this.prisma.buildingWhatsapp.findUnique({
      where: { buildingId }
    });

    if (!instance || instance.status !== 'CONNECTED') {
      throw new Error('WhatsApp instance not found or not connected');
    }

    // Aquí iría la lógica para enviar el mensaje usando Evolution API
    // Por ahora solo logueamos
    console.log(`Sending WhatsApp message to ${to}: ${message}`);
  }
}
