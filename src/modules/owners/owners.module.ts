import { Module } from '@nestjs/common';
import { OwnersController } from './owners.controller';
import { OwnersService } from './owners.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { WhatsAppModule } from '../buildings/whatsapp.module';

@Module({
  imports: [PrismaModule, WhatsAppModule],
  controllers: [OwnersController],
  providers: [OwnersService],
  exports: [OwnersService]
})
export class OwnersModule {}
