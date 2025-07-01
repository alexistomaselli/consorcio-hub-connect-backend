import { Module } from '@nestjs/common';
import { BuildingsService } from './buildings.service';
import { BuildingsController } from './buildings.controller';
import { WhatsAppService } from './whatsapp.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { N8nWebhookModule } from '../n8n/n8n-webhook.module';
import { WhatsAppModule } from './whatsapp.module';

@Module({
  imports: [PrismaModule, N8nWebhookModule, WhatsAppModule],
  controllers: [BuildingsController],
  providers: [BuildingsService],
  exports: [BuildingsService],
})
export class BuildingsModule {}
