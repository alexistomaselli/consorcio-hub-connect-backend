import { Module } from '@nestjs/common';
import { N8nWebhookService } from './n8n-webhook.service';
import { N8nWebhookController } from './n8n-webhook.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [N8nWebhookController],
  providers: [N8nWebhookService],
  exports: [N8nWebhookService],
})
export class N8nModule {}
