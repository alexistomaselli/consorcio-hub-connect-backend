import { Module } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { N8nModule } from '../n8n/n8n.module';

@Module({
  imports: [PrismaModule, N8nModule],
  providers: [WhatsAppService],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}