import { Module } from '@nestjs/common';
import { N8nWebhookService } from './n8n-webhook.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [N8nWebhookService],
  exports: [N8nWebhookService],
})
export class N8nWebhookModule {}
