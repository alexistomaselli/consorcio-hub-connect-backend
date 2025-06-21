import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class WhatsappService {
  private verificationCodes: Map<string, { code: string; expiresAt: Date }> = new Map();

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService
  ) {}

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

  async sendVerificationCode(whatsappNumber: string): Promise<void> {
    const code = crypto.randomBytes(3).toString('hex').toUpperCase();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutos

    this.verificationCodes.set(whatsappNumber, { code, expiresAt });

    const message = `Tu código de verificación es: ${code}\nExpira en 5 minutos.`;
    await this.sendMessage(whatsappNumber, message);
  }

  async verifyCode(whatsappNumber: string, code: string): Promise<boolean> {
    const verification = this.verificationCodes.get(whatsappNumber);
    
    if (!verification) {
      return false;
    }

    if (new Date() > verification.expiresAt) {
      this.verificationCodes.delete(whatsappNumber);
      return false;
    }

    if (verification.code !== code) {
      return false;
    }

    this.verificationCodes.delete(whatsappNumber);
    return true;
  }
}
