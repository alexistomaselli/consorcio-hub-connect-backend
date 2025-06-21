import { Module } from '@nestjs/common';
import { SpacesController } from './spaces.controller';
import { SpacesSetupController } from './spaces-setup.controller';
import { SpacesService } from './spaces.service';
import { SpacesSchemaService } from './spaces-schema.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SpacesController, SpacesSetupController],
  providers: [SpacesService, SpacesSchemaService],
  exports: [SpacesService],
})
export class SpacesModule {}
