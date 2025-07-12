import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MinioConfigService } from './minio.config';

@Module({
  imports: [ConfigModule],
  providers: [MinioConfigService],
  exports: [MinioConfigService]
})
export class MinioConfigModule {}
