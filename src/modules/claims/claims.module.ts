import { Module } from '@nestjs/common';
import { ClaimsService } from './claims.service';
import { ClaimsController } from './claims.controller';
import { PrismaService } from '@/prisma/prisma.service';
import { ClaimsSchemaService } from './claims-schema.service';

@Module({
  controllers: [ClaimsController],
  providers: [ClaimsService, PrismaService, ClaimsSchemaService],
})
export class ClaimsModule {}
