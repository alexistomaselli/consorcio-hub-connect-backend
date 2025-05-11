import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [WhatsappService],
  exports: [WhatsappService]
})
export class WhatsappModule {}
