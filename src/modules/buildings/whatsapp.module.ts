import { Module } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppController } from './whatsapp.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { N8nModule } from '../n8n/n8n.module';
import { N8nWebhookModule } from '../n8n/n8n-webhook.module';

@Module({
  imports: [PrismaModule, N8nModule, N8nWebhookModule],
  controllers: [WhatsAppController],
  providers: [WhatsAppService],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}