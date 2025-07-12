import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  Body,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiParam } from '@nestjs/swagger';
import { RegulationsService } from './regulations.service';
import { CreateRegulationDto } from './dto/create-regulation.dto';
import { RegulationResponseDto } from './dto/regulation-response.dto';
// Definición genérica para el tipo de archivo subido
type UploadedFile = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
};

@ApiTags('regulations')
@Controller('regulations')
export class RegulationsController {
  constructor(private readonly regulationsService: RegulationsService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BUILDING_ADMIN')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Subir un nuevo reglamento o reemplazar el existente' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Archivo PDF del reglamento',
        },
        buildingId: {
          type: 'string',
          description: 'ID del edificio (UUID)',
        },
      },
    },
  })
  async uploadRegulation(
    @UploadedFile() file: UploadedFile,
    @Body() createRegulationDto: CreateRegulationDto,
    @Req() req,
  ): Promise<RegulationResponseDto> {
    return this.regulationsService.uploadRegulation(
      file,
      createRegulationDto,
      req.user.id,
    );
  }

  @Get(':buildingId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obtener el reglamento de un edificio' })
  @ApiParam({
    name: 'buildingId',
    type: 'string',
    description: 'ID del edificio (UUID)',
  })
  async getRegulation(
    @Param('buildingId') buildingId: string,
    @Req() req,
  ): Promise<RegulationResponseDto> {
    return this.regulationsService.getRegulation(buildingId, req.user.id);
  }

  @Delete(':buildingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BUILDING_ADMIN')
  @ApiOperation({ summary: 'Eliminar el reglamento de un edificio' })
  @ApiParam({
    name: 'buildingId',
    type: 'string',
    description: 'ID del edificio (UUID)',
  })
  async deleteRegulation(
    @Param('buildingId') buildingId: string,
    @Req() req,
  ): Promise<void> {
    return this.regulationsService.deleteRegulation(buildingId, req.user.id);
  }
}
