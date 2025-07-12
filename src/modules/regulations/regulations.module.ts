import { Module } from '@nestjs/common';
import { RegulationsController } from './regulations.controller';
import { RegulationsService } from './regulations.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { MinioConfigService } from '../../config/minio.config';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [RegulationsController],
  providers: [RegulationsService, MinioConfigService],
  exports: [RegulationsService],
})
export class RegulationsModule {}
