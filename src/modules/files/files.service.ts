import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MinioConfigService } from '../../config/minio.config';

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minioConfig: MinioConfigService,
  ) {}

  /**
   * Genera una URL presignada para acceder a un archivo
   * @param path Ruta del archivo en MinIO
   * @returns URL presignada con tiempo de expiración
   */
  async generateFileUrl(path: string): Promise<string> {
    try {
      console.log(`[FilesService] Generando URL presignada para: ${path}`);
      const url = await this.minioConfig.generatePresignedUrl(path);
      console.log(`[FilesService] URL generada: ${url}`);
      return url;
    } catch (error) {
      console.error(`[FilesService] Error al generar URL presignada:`, error);
      throw new Error(`Error al generar URL presignada: ${error.message}`);
    }
  }
  
  /**
   * Obtiene un stream directo del archivo desde MinIO
   * @param path Ruta del archivo en MinIO
   * @returns Stream del archivo para servir directamente al cliente
   */
  async getFileStreamFromMinio(path: string): Promise<any> {
    try {
      console.log(`[FilesService] Obteniendo stream para archivo: ${path}`);
      return await this.minioConfig.getFile(path);
    } catch (error) {
      console.error(`[FilesService] Error al obtener stream del archivo:`, error);
      throw new Error(`Error al obtener archivo desde MinIO: ${error.message}`);
    }
  }

  /**
   * Obtiene un archivo por tipo y buildingId
   * Por ejemplo, para obtener el reglamento del edificio
   */
  async getFileByType(buildingId: string, type: string) {
    try {
      // Obtener el schema del building
      const building = await this.prisma.building.findUnique({
        where: { id: buildingId },
        select: { schema: true }
      });

      if (!building) {
        throw new Error(`Building con ID ${buildingId} no encontrado`);
      }

      // Buscar el archivo por tipo
      const files = await this.prisma.$queryRawUnsafe<any[]>(`
        SELECT * FROM "${building.schema}".files 
        WHERE type = '${type}' 
        ORDER BY created_at DESC 
        LIMIT 1
      `);

      // Si no hay resultados, retornar null
      if (!files || files.length === 0) {
        return null;
      }

      return files[0];
    } catch (error) {
      console.error(`Error al obtener archivo de tipo ${type}:`, error);
      throw new Error(`Error al obtener archivo: ${error.message}`);
    }
  }

  /**
   * Guarda un nuevo archivo en la base de datos y en MinIO
   */
  async saveFile(buildingId: string, userId: string, file: any, fileData: {
    type: string;
    name: string;
  }) {
    try {
      // 1. Obtener el schema del building
      const building = await this.prisma.building.findUnique({
        where: { id: buildingId },
        select: { schema: true }
      });

      if (!building) {
        throw new Error(`Building con ID ${buildingId} no encontrado`);
      }

      // 2. Subir el archivo a MinIO
      const uniqueFilename = `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
      const filePath = `buildings/${buildingId}/${fileData.type}/${uniqueFilename}`;
      const uploadResult = await this.minioConfig.uploadFile(
        file.buffer,
        filePath,
        file.mimetype
      );

      // 3. Guardar los metadatos en la base de datos
      const result = await this.prisma.$queryRawUnsafe<any[]>(`
        INSERT INTO "${building.schema}".files (
          type, 
          name, 
          owner_id, 
          filename, 
          file_url, 
          file_size, 
          mime_type, 
          is_processed
        ) VALUES (
          '${fileData.type}',
          '${fileData.name}',
          '${userId}',
          '${file.originalname}',
          '${uploadResult.url}',
          ${file.size},
          '${file.mimetype}',
          true
        )
        RETURNING *
      `);

      return result[0];
    } catch (error) {
      console.error(`Error al guardar archivo:`, error);
      throw new Error(`Error al guardar archivo: ${error.message}`);
    }
  }

  /**
   * Elimina un archivo por tipo y buildingId
   */
  async deleteFileByType(buildingId: string, type: string) {
    try {
      // 1. Obtener el schema del building
      const building = await this.prisma.building.findUnique({
        where: { id: buildingId },
        select: { schema: true }
      });

      if (!building) {
        throw new Error(`Building con ID ${buildingId} no encontrado`);
      }

      // 2. Buscar el archivo para obtener la URL y poder eliminarlo de MinIO
      const files = await this.prisma.$queryRawUnsafe<any[]>(`
        SELECT * FROM "${building.schema}".files 
        WHERE type = '${type}'
        ORDER BY created_at DESC
        LIMIT 1
      `);

      if (!files || files.length === 0) {
        throw new Error(`No se encontró archivo de tipo ${type}`);
      }

      const file = files[0];

      // 3. Eliminar el archivo de MinIO
      // Extraer la ruta del archivo de la URL para eliminar
      const fileUrl = file.file_url;
      // Extraer la ruta basada en la estructura conocida
      const pathMatch = fileUrl.match(/\/([^\/]+\/[^\/]+\/[^\/]+\/[^\/]+)$/);
      if (!pathMatch) {
        throw new Error('No se pudo determinar la ruta del archivo');
      }
      const filePath = pathMatch[1];
      await this.minioConfig.deleteFile(filePath);

      // 4. Eliminar el registro de la base de datos
      await this.prisma.$queryRawUnsafe(`
        DELETE FROM "${building.schema}".files 
        WHERE id = '${file.id}'
      `);

      return { success: true, message: `Archivo de tipo ${type} eliminado correctamente` };
    } catch (error) {
      console.error(`Error al eliminar archivo:`, error);
      throw new Error(`Error al eliminar archivo: ${error.message}`);
    }
  }
}
