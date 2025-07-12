import { Controller, Get, Param, Res, StreamableFile, Header } from '@nestjs/common';
import { Response } from 'express';
import { FilesService } from './files.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

/**
 * Controlador completamente público para archivos que no requieren autenticación
 * Este controlador NO hereda ningún guard o protección
 */
@ApiTags('Archivos Públicos')
@Controller('public-files')
export class PublicFilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Endpoint completamente público para ver archivos
   */
  @Get(':buildingId/:type/view')
  @ApiOperation({ summary: 'Ver archivo público por edificio y tipo (sin autenticación)' })
  @ApiResponse({ status: 200, description: 'Archivo servido correctamente' })
  @ApiResponse({ status: 404, description: 'Archivo no encontrado' })
  @ApiParam({ name: 'buildingId', type: 'string', description: 'ID del edificio' })
  @ApiParam({ name: 'type', type: 'string', description: 'Tipo de archivo a ver (ej: regulation)' })
  @Header('Content-Disposition', 'inline')
  async viewPublicFile(
    @Param('buildingId') buildingId: string,
    @Param('type') type: string,
    @Res({ passthrough: true }) res: Response
  ): Promise<StreamableFile | null> {
    console.log('======== INICIO DEL PROCESO DE OBTENCIÓN DE ARCHIVO PÚBLICO ========');
    console.log(`BuildingId: ${buildingId}`);
    console.log(`Type: ${type}`);
    try {
      console.log(`[PublicFilesController] Sirviendo archivo público de tipo ${type} para edificio ${buildingId}`);
      
      // 1. Obtener información del archivo desde la base de datos
      console.log('1. Buscando información del edificio en la base de datos...');
      const building = await this.prisma.building.findUnique({
        where: { id: buildingId },
        select: { schema: true }
      });
      
      if (!building) {
        console.error(`¡ERROR! Edificio con ID ${buildingId} no encontrado`);
        throw new Error(`Edificio con ID ${buildingId} no encontrado`);
      }
      
      console.log(`Edificio encontrado. Schema: ${building.schema}`);
      
      // 2. Consultar el archivo en la tabla específica del edificio
      console.log('2. Consultando el archivo en la tabla específica del edificio...');
      let files;
      try {
        const query = `
          SELECT * FROM "${building.schema}".files 
          WHERE type = '${type}'
          ORDER BY created_at DESC
          LIMIT 1
        `;
        console.log(`Query SQL: ${query}`);
        files = await this.prisma.$queryRawUnsafe<any[]>(query);
        console.log(`Resultado de la consulta:`, files);
      } catch (sqlError) {
        console.error('Error en la consulta SQL:', sqlError);
        throw new Error(`Error en la consulta SQL: ${sqlError.message}`);
      }
      
      if (!files || files.length === 0) {
        throw new Error(`No se encontró archivo público de tipo ${type}`);
      }
      
      const fileInfo = files[0];
      
      // 3. Extraer la ruta relativa del archivo de la URL almacenada
      console.log('3. Extrayendo ruta relativa del archivo de la URL almacenada...');
      console.log(`URL original: ${fileInfo.file_url}`);
      let filePath;
      try {
        filePath = fileInfo.file_url.split('/').slice(3).join('/');
        console.log(`Ruta después del split y slice: ${filePath}`);
        
        if (filePath.startsWith('consorcio-hub/')) {
          filePath = filePath.substring('consorcio-hub/'.length);
          console.log(`Ruta después de eliminar prefijo consorcio-hub/: ${filePath}`);
        }
      } catch (pathError) {
        console.error('Error al procesar la ruta del archivo:', pathError);
        throw new Error(`Error al procesar la ruta del archivo: ${pathError.message}`);
      }
      
      console.log(`[PublicFilesController] Accediendo al archivo público en ruta: ${filePath}`);
      
      // 4. Obtener el stream del archivo desde MinIO
      console.log('4. Obteniendo el stream del archivo desde MinIO...');
      let fileStream;
      try {
        console.log(`Ruta completa del archivo en MinIO: ${filePath}`);
        fileStream = await this.filesService.getFileStreamFromMinio(filePath);
        console.log('Stream de MinIO obtenido correctamente');
      } catch (minioError) {
        console.error('Error al obtener el archivo de MinIO:', minioError);
        throw new Error(`Error al obtener el archivo de MinIO: ${minioError.message}`);
      }
      
      // 5. Establecer los headers correctos para el tipo de contenido
      console.log('5. Estableciendo headers correctos para la respuesta...');
      try {
        const contentType = fileInfo.mime_type || 'application/octet-stream';
        console.log(`Content-Type: ${contentType}`);
        
        res.set({
          'Content-Type': contentType,
          'Cache-Control': 'max-age=60',
          // Permitir CORS para este endpoint público
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept'
        });
        console.log('Headers establecidos correctamente');
      } catch (headerError) {
        console.error('Error al establecer headers de respuesta:', headerError);
        throw new Error(`Error al establecer headers: ${headerError.message}`);
      }
      
      // 6. Devolver el archivo como stream
      console.log('6. Devolviendo archivo como stream...');
      try {
        console.log('Creando StreamableFile...');
        const streamableFile = new StreamableFile(fileStream);
        console.log('StreamableFile creado correctamente');
        console.log('======== FIN DEL PROCESO DE OBTENCIÓN DE ARCHIVO PÚBLICO ========');
        return streamableFile;
      } catch (streamError) {
        console.error('Error al crear StreamableFile:', streamError);
        throw new Error(`Error al crear StreamableFile: ${streamError.message}`);
      }
    } catch (error) {
      console.error(`[PublicFilesController] ERROR AL SERVIR ARCHIVO PÚBLICO:`, error);
      console.error(`Stack trace:`, error.stack);
      
      // Evitar recursion infinita con BigInt y objetos complejos
      // Solo enviar el mensaje de error sin objetos complejos
      res.status(500).send(JSON.stringify({
        error: true,
        message: `Error interno del servidor: ${error.message}`
      }));
      
      console.log('======== FIN DEL PROCESO CON ERROR ========');
      return null; // Retornamos null en lugar de lanzar el error
    }
  }
}
