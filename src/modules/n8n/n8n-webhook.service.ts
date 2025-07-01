import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class N8nWebhookService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    name: string;
    description?: string;
    prodUrl: string;
    testUrl?: string;
  }) {
    return this.prisma.n8nWebhook.create({
      data,
    });
  }

  async findAll() {
    return this.prisma.n8nWebhook.findMany();
  }

  async findByName(name: string) {
    console.log('Finding webhook by name:', name);
    const webhook = await this.prisma.n8nWebhook.findUnique({
      where: { name },
    });

    if (!webhook) {
      return {
        success: false,
        error: `Webhook ${name} not found`,
      };
    }

    return {
      success: true,
      data: webhook,
    };
  }

  async update(id: string, data: {
    name?: string;
    description?: string;
    prodUrl?: string;
    testUrl?: string;
  }) {
    return this.prisma.n8nWebhook.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return this.prisma.n8nWebhook.delete({
      where: { id },
    });
  }

  async getWebhook(name: string) {
    const response = await this.findByName(name);
    if (!response.success || !response.data) {
      throw new Error(response.error || `Webhook ${name} not found`);
    }

    const webhook = response.data;
    // En desarrollo, usar la URL de test si está disponible
    if (process.env.NODE_ENV === 'development' && webhook.testUrl) {
      return {
        ...webhook,
        prodUrl: webhook.prodUrl
      };
    }

    return webhook;
  }

  async getWebhookUrl(name: string) {
    const webhook = await this.getWebhook(name);
    return webhook.prodUrl;
  }
}
