import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { PublicFilesController } from './public-files.controller';
import { SimpleFilesController } from './simple-files.controller';
import { FilesService } from './files.service';
import { FilesSchemaService } from './files-schema.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { MinioConfigModule } from '../../config/minio.module';

@Module({
  imports: [PrismaModule, ConfigModule, MinioConfigModule],
  controllers: [FilesController, PublicFilesController, SimpleFilesController],
  providers: [FilesService, FilesSchemaService],
  exports: [FilesService, FilesSchemaService]
})
export class FilesModule {}
