import { Module } from '@nestjs/common';
import { BuildingsService } from './buildings.service';
import { BuildingsController } from './buildings.controller';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { N8nWebhookModule } from '../n8n/n8n-webhook.module';

@Module({
  imports: [PrismaModule, N8nWebhookModule],
  controllers: [BuildingsController, WhatsAppController],
  providers: [BuildingsService, WhatsAppService],
  exports: [BuildingsService, WhatsAppService],
})
export class BuildingsModule {}
