import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, ConfigModule],
  providers: [WhatsappService],
  exports: [WhatsappService]
})
export class WhatsappModule {}
