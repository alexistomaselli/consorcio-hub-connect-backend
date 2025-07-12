import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
// Importar minio usando require para evitar problemas con las tipificaciones
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Minio = require('minio');
import { ApiTags, ApiOperation } from '@nestjs/swagger';

// Interfaz para tipificar los objetos de MinIO
interface MinioObject {
  name: string;
  prefix?: string;
  size: number;
  etag?: string;
  lastModified: Date;
}

@ApiTags('Archivos Simples')
@Controller('simple-files')
export class SimpleFilesController {
  private readonly minioClient: any; // Cliente de MinIO
  private readonly bucketName: string;

  constructor(private readonly configService: ConfigService) {
    // Configuración directa de MinIO sin usar servicios intermedios
    this.minioClient = new Minio.Client({
      endPoint: this.configService.get('MINIO_ENDPOINT', 'localhost'),
      port: parseInt(this.configService.get('MINIO_PORT', '9000')),
      useSSL: this.configService.get('MINIO_USE_SSL', 'false') === 'true',
      accessKey: this.configService.get('MINIO_ACCESS_KEY', 'minioadmin'),
      secretKey: this.configService.get('MINIO_SECRET_KEY', 'minioadmin'),
    });

    this.bucketName = this.configService.get('MINIO_BUCKET_NAME', 'consorcio-hub');
  }

  @Get('regulation/:buildingId')
  @ApiOperation({ summary: 'Ver archivo de reglamento (sin autenticación)' })
  async viewRegulation(
    @Param('buildingId') buildingId: string,
    @Res() res: Response
  ): Promise<void> {
    try {
      console.log(`[SimpleFilesController] Obteniendo reglamento para edificio: ${buildingId}`);
      
      // Directorio donde se almacena el reglamento para este edificio
      const directory = `buildings/${buildingId}/regulation/`;
      
      console.log(`[SimpleFilesController] Buscando archivos en directorio: ${directory}`);
      
      // Obtener listado de objetos en el directorio
      const listObjectsStream = this.minioClient.listObjects(this.bucketName, directory, true);
      
      let latestObject: MinioObject | null = null;
      let latestTimestamp = 0;
      
      // Esperar a que se obtengan todos los objetos para encontrar el más reciente
      const objectsList: MinioObject[] = [];
      
      try {
        // Usar una promesa para manejar el stream de objetos
        await new Promise<void>((resolve, reject) => {
          listObjectsStream.on('data', (obj: MinioObject) => {
            console.log(`[SimpleFilesController] Objeto encontrado: ${obj.name}`);
            objectsList.push(obj);
            
            // Intentamos extraer el timestamp del nombre del archivo
            const fileNameMatch = obj.name.match(/\/(\d+)-[^/]+$/); // Extraer el timestamp
            if (fileNameMatch && fileNameMatch[1]) {
              const timestamp = parseInt(fileNameMatch[1], 10);
              if (timestamp > latestTimestamp) {
                latestTimestamp = timestamp;
                latestObject = obj;
              }
            }
          });
          
          listObjectsStream.on('error', (err) => {
            console.error('[SimpleFilesController] Error al listar objetos:', err);
            reject(err);
          });
          
          listObjectsStream.on('end', () => {
            resolve();
          });
        });
        
        // Si no encontramos ningún objeto o no pudimos determinar el más reciente
        if (!latestObject && objectsList.length > 0) {
          // Usar el último objeto de la lista como fallback
          latestObject = objectsList[objectsList.length - 1];
        }
        
        if (!latestObject) {
          console.error('[SimpleFilesController] No se encontraron archivos de reglamento para este edificio');
          return res.status(404).send({ error: true, message: 'No se encontró el reglamento para este edificio' }) as any; // Casting para evitar error de tipo
        }
        
        // Usar el objeto más reciente
        const filePath = latestObject.name;
        console.log(`[SimpleFilesController] Usando el archivo más reciente: ${filePath}`);
        
        // Configurar headers básicos
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'max-age=60');
        
        // Transmitir directamente el archivo desde MinIO a la respuesta HTTP
        this.minioClient.getObject(this.bucketName, filePath, (err, dataStream) => {
          if (err) {
            console.error('[SimpleFilesController] Error al obtener objeto de MinIO:', err);
            return res.status(404).send({ error: true, message: `Archivo no encontrado: ${err.message}` });
          }
          
          console.log('[SimpleFilesController] Stream obtenido, enviando al cliente');
          
          dataStream.on('error', (streamErr) => {
            console.error('[SimpleFilesController] Error en el stream:', streamErr);
            res.status(500).send({ error: true, message: 'Error al transmitir el archivo' });
          });
          
          // Piping directo a la respuesta
          dataStream.pipe(res);
        });
      } catch (e) {
        console.error('[SimpleFilesController] Error al listar objetos o transmitir:', e);
        res.status(500).send({ error: true, message: `Error al acceder al almacenamiento: ${e.message}` });
      }
    } catch (error) {
      console.error('[SimpleFilesController] Error general:', error);
      res.status(500).send({ error: true, message: 'Error interno del servidor' });
    }
  }
}
