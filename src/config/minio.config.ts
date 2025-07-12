import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Importar minio usando require para evitar problemas con las tipificaciones
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Minio = require('minio');

// Definir tipos necesarios para MinIO
type BucketStream<T = any> = any;
interface UploadedObjectInfo {
  etag: string;
  [key: string]: any;
}

@Injectable()
export class MinioConfigService {
  private readonly client: any; // Cliente de MinIO
  private readonly bucketName: string;

  constructor(private readonly configService: ConfigService) {
    // Configuración del cliente MinIO
    this.client = new Minio.Client({
      endPoint: this.configService.get('MINIO_ENDPOINT', 'localhost'),
      port: parseInt(this.configService.get('MINIO_PORT', '9000')),
      useSSL: this.configService.get('MINIO_USE_SSL', 'false') === 'true',
      accessKey: this.configService.get('MINIO_ACCESS_KEY', 'minioadmin'),
      secretKey: this.configService.get('MINIO_SECRET_KEY', 'minioadmin'),
    });

    this.bucketName = this.configService.get('MINIO_BUCKET_NAME', 'consorcio-hub');
    
    // Inicializar el bucket si no existe
    this.initBucket();
  }

  private async initBucket(): Promise<void> {
    const exists = await this.client.bucketExists(this.bucketName);
    if (!exists) {
      await this.client.makeBucket(this.bucketName, 'us-east-1');
      
      // Configurar políticas de acceso para el bucket si es necesario
      // Por ejemplo, para hacer accesibles públicamente los archivos:
      // await this.client.setBucketPolicy(this.bucketName, JSON.stringify({...}));
    }
  }

  /**
   * Sube un archivo al almacenamiento MinIO
   * @param file Buffer del archivo a subir
   * @param path Ruta donde se guardará (incluye nombre del archivo)
   * @param contentType Tipo de contenido del archivo
   * @returns Información del archivo subido
   */
  async uploadFile(
    file: Buffer,
    path: string,
    contentType: string,
  ): Promise<{ url: string; etag: string }> {
    const uploadInfo: UploadedObjectInfo = await this.client.putObject(
      this.bucketName,
      path,
      file,
      file.length,
      { 'Content-Type': contentType }
    );
    
    // Construir URL de acceso al archivo basada en la configuración
    const endpointPublic = this.configService.get('MINIO_ENDPOINT_PUBLIC');
    let fileUrl;
    
    if (endpointPublic) {
      // Si hay un endpoint público configurado, úsalo
      fileUrl = `${endpointPublic}/${this.bucketName}/${path}`;
    } else {
      // De lo contrario, construye la URL basada en configuración local
      const protocol = this.configService.get('MINIO_USE_SSL', 'false') === 'true' ? 'https' : 'http';
      const endpoint = this.configService.get('MINIO_ENDPOINT', 'localhost');
      const port = this.configService.get('MINIO_PORT', '9000');
      fileUrl = `${protocol}://${endpoint}:${port}/${this.bucketName}/${path}`;
    }

    // Devolver URL y etag como string
    return { 
      url: fileUrl, 
      etag: uploadInfo.etag.toString() 
    };
  }

  /**
   * Obtiene un archivo del almacenamiento MinIO
   * @param path Ruta del archivo
   * @returns Stream del archivo
   */
  async getFile(path: string): Promise<BucketStream<NodeJS.ReadableStream>> {
    return this.client.getObject(this.bucketName, path);
  }

  /**
   * Elimina un archivo del almacenamiento MinIO
   * @param path Ruta del archivo a eliminar
   */
  async deleteFile(path: string): Promise<void> {
    await this.client.removeObject(this.bucketName, path);
  }

  /**
   * Verifica si un archivo existe en el almacenamiento
   * @param path Ruta del archivo
   * @returns true si existe, false si no
   */
  async fileExists(path: string): Promise<boolean> {
    try {
      await this.client.statObject(this.bucketName, path);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Genera una URL presignada para acceder a un archivo
   * @param path Ruta del archivo
   * @param expiryInSeconds Tiempo de expiración en segundos
   * @returns URL presignada accesible desde el navegador
   */
  async generatePresignedUrl(
    path: string,
    expiryInSeconds = 3600,
  ): Promise<string> {
    // Obtener la URL presignada del cliente MinIO
    const presignedUrl = await this.client.presignedGetObject(this.bucketName, path, expiryInSeconds);
    
    console.log(`[MinioConfig] URL presignada original: ${presignedUrl}`);
    
    // Reemplazar el hostname interno (minio:9000) por localhost:9000 para acceso desde navegador
    // O usar la URL pública configurada si existe
    const endpointPublic = this.configService.get('MINIO_ENDPOINT_PUBLIC');
    let accessibleUrl;
    
    if (endpointPublic) {
      // Si hay un endpoint público configurado, lo usamos como base para la URL
      accessibleUrl = presignedUrl.replace(
        new RegExp(`http[s]?:\/\/${this.configService.get('MINIO_ENDPOINT', 'localhost')}:${this.configService.get('MINIO_PORT', '9000')}`), 
        endpointPublic.startsWith('http') ? endpointPublic : `http://${endpointPublic}`
      );
    } else {
      // De lo contrario, reemplazamos el nombre del contenedor por localhost
      accessibleUrl = presignedUrl.replace(
        new RegExp(`http[s]?:\/\/${this.configService.get('MINIO_ENDPOINT', 'localhost')}:${this.configService.get('MINIO_PORT', '9000')}`),
        `http://localhost:${this.configService.get('MINIO_PORT', '9000')}`
      );
    }
    
    console.log(`[MinioConfig] URL presignada accesible: ${accessibleUrl}`);
    return accessibleUrl;
  }
}
