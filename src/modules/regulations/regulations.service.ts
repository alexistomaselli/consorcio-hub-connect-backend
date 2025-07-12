import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MinioConfigService } from '../../config/minio.config';
import { CreateRegulationDto } from './dto/create-regulation.dto';
import { RegulationResponseDto } from './dto/regulation-response.dto';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';

@Injectable()
export class RegulationsService {
  constructor(
    private prisma: PrismaService,
    private minioService: MinioConfigService,
    private configService: ConfigService,
  ) {}

  /**
   * Sube un nuevo reglamento para un edificio o reemplaza el existente
   */
  async uploadRegulation(
    file: any, // Express.Multer.File
    createRegulationDto: CreateRegulationDto,
    userId: string,
  ): Promise<RegulationResponseDto> {
    const buildingId = String(createRegulationDto.buildingId);

    // Verificar que el archivo sea un PDF
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Solo se permiten archivos PDF');
    }

    // Verificar si el usuario es admin del edificio
    const building = await this.prisma.building.findFirst({
      where: {
        id: buildingId,
        adminId: userId,
      },
    });

    if (!building) {
      throw new BadRequestException(
        'No tienes permisos para administrar este edificio',
      );
    }

    if (!building) {
      throw new NotFoundException(`No se encontró el edificio con ID ${buildingId}`);
    }

    // Obtener el schema correspondiente al edificio
    const buildingSchema = `building_${building.schema}`;

    // Verificar si ya existe un reglamento para este edificio
    const existingRegulation = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM ${buildingSchema}.regulation LIMIT 1`
    );

    // Generar la ruta donde se guardará el archivo en MinIO
    const filePath = `buildings/${buildingId}/regulations/reglamento.pdf`;
    
    // Subir el archivo a MinIO
    const { url, etag } = await this.minioService.uploadFile(
      file.buffer,
      filePath,
      file.mimetype,
    );

    // Datos para guardar en la base de datos
    const regulationData = {
      buildingId,
      filename: file.originalname,
      filePath,
      fileSize: file.size,
      mimeType: file.mimetype,
      isProcessed: false,
      webhookName: 'process_building_regulations',
      uploadedAt: new Date(),
      updatedAt: new Date(),
    };

    let regulation;

    if (existingRegulation && existingRegulation.length > 0) {
      // Actualizar el registro existente
      regulation = await this.prisma.$executeRawUnsafe(
        `UPDATE ${buildingSchema}.regulation SET 
        filename = '${regulationData.filename}',
        filePath = '${regulationData.filePath}',
        fileSize = ${regulationData.fileSize},
        mimeType = '${regulationData.mimeType}',
        isProcessed = false,
        updatedAt = now()
        WHERE id = ${existingRegulation[0].id}
        RETURNING *`
      );
    } else {
      // Crear tabla regulation si no existe
      await this.prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS ${buildingSchema}.regulation (
          id SERIAL PRIMARY KEY,
          buildingId INTEGER NOT NULL,
          filename TEXT NOT NULL,
          filePath TEXT NOT NULL,
          fileSize INTEGER NOT NULL,
          mimeType TEXT NOT NULL,
          uploadedAt TIMESTAMP NOT NULL DEFAULT now(),
          updatedAt TIMESTAMP NOT NULL DEFAULT now(),
          isProcessed BOOLEAN NOT NULL DEFAULT false,
          webhookName TEXT
        )`
      );

      // Insertar nuevo registro
      const result = await this.prisma.$queryRawUnsafe<any[]>(
        `INSERT INTO ${buildingSchema}.regulation 
        (buildingId, filename, filePath, fileSize, mimeType, isProcessed, webhookName, uploadedAt, updatedAt) 
        VALUES 
        (${buildingId}, '${regulationData.filename}', '${regulationData.filePath}', 
        ${regulationData.fileSize}, '${regulationData.mimeType}', false, 
        '${regulationData.webhookName}', now(), now())
        RETURNING *`
      );
      
      regulation = result[0];
    }

    // Crear tabla embeddings_reglamento si no existe
    await this.prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS ${buildingSchema}.embeddings_reglamento (
        id SERIAL PRIMARY KEY,
        fragment TEXT NOT NULL,
        embedding vector(1536),
        created_at TIMESTAMP DEFAULT now()
      )`
    );

    // Notificar al webhook para procesar el documento (aquí se podría disparar un evento)
    // Esta parte se implementaría después cuando se integre con n8n

    // Construir la respuesta
    const responseDto = new RegulationResponseDto();
    responseDto.id = Number(regulation.id);
    responseDto.buildingId = Number(buildingId);
    responseDto.filename = regulation.filename;
    responseDto.fileUrl = url; // URL directa o podemos generar una URL firmada
    responseDto.fileSize = regulation.fileSize;
    responseDto.mimeType = regulation.mimeType;
    responseDto.uploadedAt = regulation.uploadedAt;
    responseDto.updatedAt = regulation.updatedAt;
    responseDto.isProcessed = regulation.isProcessed;

    return responseDto;
  }

  /**
   * Obtiene el reglamento de un edificio
   */
  async getRegulation(
    buildingId: string,
    userId: string,
  ): Promise<RegulationResponseDto> {
    // Verificar que el usuario sea admin o propietario del edificio
    const isAdmin = await this.prisma.building.findFirst({
      where: {
        id: buildingId,
        adminId: userId,
      },
    });
    
    const isOwner = await this.prisma.buildingOwner.findFirst({
      where: {
        userId,
        buildingId,
      },
    });

    if (!isAdmin && !isOwner) {
      throw new BadRequestException(
        'No tienes permisos para acceder a este edificio',
      );
    }

    // Obtener el edificio
    const building = await this.prisma.building.findUnique({
      where: { id: buildingId },
    });

    if (!building) {
      throw new NotFoundException(`No se encontró el edificio con ID ${buildingId}`);
    }

    // Obtener el schema correspondiente al edificio
    const buildingSchema = `building_${building.schema}`;

    // Obtener el reglamento
    const regulations = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM ${buildingSchema}.regulation LIMIT 1`
    );

    if (!regulations || regulations.length === 0) {
      throw new NotFoundException(`No se ha subido ningún reglamento para este edificio`);
    }

    const regulation = regulations[0];

    // Generar una URL presignada para acceso temporal al archivo
    const presignedUrl = await this.minioService.generatePresignedUrl(
      regulation.filePath,
      3600 // 1 hora de validez
    );

    // Construir la respuesta
    const responseDto = new RegulationResponseDto();
    responseDto.id = Number(regulation.id);
    responseDto.buildingId = Number(buildingId);
    responseDto.filename = regulation.filename;
    responseDto.fileUrl = presignedUrl;
    responseDto.fileSize = regulation.fileSize;
    responseDto.mimeType = regulation.mimeType;
    responseDto.uploadedAt = regulation.uploadedAt;
    responseDto.updatedAt = regulation.updatedAt;
    responseDto.isProcessed = regulation.isprocessed;

    return responseDto;
  }

  /**
   * Elimina el reglamento de un edificio
   */
  async deleteRegulation(buildingId: string, userId: string): Promise<void> {
    // Verificar que el usuario sea admin del edificio
    const adminBuilding = await this.prisma.building.findFirst({
      where: {
        id: buildingId,
        adminId: userId,
      },
    });

    if (!adminBuilding) {
      throw new BadRequestException(
        'No tienes permisos para administrar este edificio',
      );
    }

    // Obtener el edificio (este ya tiene los datos completos)
    const building = await this.prisma.building.findUnique({
      where: { id: buildingId },
    });

    if (!building) {
      throw new NotFoundException(`No se encontró el edificio con ID ${buildingId}`);
    }

    // Obtener el schema correspondiente al edificio
    const buildingSchema = `building_${building.schema}`;

    // Verificar si existe un reglamento para este edificio
    const regulations = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM ${buildingSchema}.regulation LIMIT 1`
    );

    if (!regulations || regulations.length === 0) {
      throw new NotFoundException(`No se ha subido ningún reglamento para este edificio`);
    }

    const regulation = regulations[0];

    // Eliminar el archivo de MinIO
    await this.minioService.deleteFile(regulation.filePath);

    // Eliminar el registro de la base de datos
    await this.prisma.$executeRawUnsafe(
      `DELETE FROM ${buildingSchema}.regulation WHERE id = ${regulation.id}`
    );

    // Eliminar los embeddings asociados
    await this.prisma.$executeRawUnsafe(
      `DELETE FROM ${buildingSchema}.embeddings_reglamento`
    );
  }
}
