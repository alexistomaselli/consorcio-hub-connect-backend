import { Controller, Get, Post, Delete, Body, Param, UseGuards, UploadedFile, Res, UseInterceptors, StreamableFile, Header, BadRequestException, Req } from '@nestjs/common';
import { Public } from '../../shared/decorators/public.decorator';
import { Response } from 'express';
import { FilesService } from './files.service';
import { FilesSchemaService } from './files-schema.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('files')
@ApiBearerAuth()
@Controller('buildings/:buildingId/files')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly filesSchemaService: FilesSchemaService,
    private readonly prisma: PrismaService
  ) {}

  // -------------------- Setup Tables --------------------

  @Get('check-tables')
  @UseGuards(JwtAuthGuard)
  // Sin roles requeridos para este endpoint
  @ApiOperation({ summary: 'Verificar si la tabla files existe' })
  @ApiResponse({
    status: 200,
    description: 'Información sobre si se requiere configuración de la tabla',
    schema: {
      properties: {
        setup_required: { type: 'boolean' },
        message: { type: 'string' }
      }
    }
  })
  @ApiParam({ name: 'buildingId', type: 'string', description: 'ID del edificio' })
  async checkTables(@Param('buildingId') buildingId: string) {
    try {
      console.log(`[FilesController] Verificando tabla para building: ${buildingId}`);
      
      // Obtener el schema del building
      const building = await this.prisma.building.findUnique({
        where: { id: buildingId },
        select: { schema: true }
      });
      
      if (!building) {
        return {
          error: true,
          message: `Building con ID ${buildingId} no encontrado`,
          setup_required: true
        };
      }
      
      // Verificar si la tabla existe
      const tableExists = await this.filesSchemaService.checkFilesTableExists(building.schema);
      
      return {
        setup_required: !tableExists,
        message: tableExists ? 'La tabla files ya existe' : 'Se requiere configurar la tabla files'
      };
    } catch (error) {
      console.error(`[FilesController] Error al verificar tabla:`, error);
      return {
        error: true,
        message: `Error al verificar tabla: ${error.message}`,
        setup_required: true
      };
    }
  }

  @Post('setup-tables')
  @UseGuards(JwtAuthGuard)
  // Sin roles requeridos para este endpoint
  @ApiOperation({ summary: 'Configurar la tabla files' })
  @ApiResponse({
    status: 200,
    description: 'Resultado de la configuración de la tabla',
    schema: {
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' }
      }
    }
  })
  @ApiParam({ name: 'buildingId', type: 'string', description: 'ID del edificio' })
  async setupTables(@Param('buildingId') buildingId: string, @Req() req) {
    try {
      console.log(`[FilesController] Iniciando configuración de tabla para building: ${buildingId}`);
      console.log('[FilesController] Usuario actual:', req.user);
      
      const result = await this.filesSchemaService.ensureFilesTableExists(buildingId);
      
      return {
        success: result,
        message: 'Tabla files configurada correctamente'
      };
    } catch (error) {
      console.error(`[FilesController] Error al configurar tabla:`, error);
      return {
        error: true,
        message: `Error al configurar tabla: ${error.message}`
      };
    }
  }

  // -------------------- File Operations --------------------

  @Get(':type/view')
  @Public() // Marcamos esta ruta como pública para que no requiera autenticación
  @ApiOperation({ summary: 'Ver archivo por tipo directamente en el navegador' })
  @ApiResponse({ status: 200, description: 'Archivo servido correctamente' })
  @ApiResponse({ status: 404, description: 'Archivo no encontrado' })
  @ApiParam({ name: 'buildingId', type: 'string', description: 'ID del edificio' })
  @ApiParam({ name: 'type', type: 'string', description: 'Tipo de archivo a ver (ej: regulation)' })
  @Header('Content-Disposition', 'inline')
  async viewFileByType(
    @Param('buildingId') buildingId: string,
    @Param('type') type: string,
    @Res({ passthrough: true }) res: Response
  ): Promise<StreamableFile> {
    try {
      console.log(`[FilesController] Sirviendo archivo de tipo ${type} para edificio ${buildingId}`);
      
      // 1. Obtener información del archivo desde la base de datos
      const building = await this.prisma.building.findUnique({
        where: { id: buildingId },
        select: { schema: true }
      });
      
      if (!building) {
        throw new Error(`Edificio con ID ${buildingId} no encontrado`);
      }
      
      // 2. Consultar el archivo en la tabla específica del edificio
      const files = await this.prisma.$queryRawUnsafe<any[]>(`
        SELECT * FROM "${building.schema}".files 
        WHERE type = '${type}'
        ORDER BY created_at DESC
        LIMIT 1
      `);
      
      if (!files || files.length === 0) {
        throw new Error(`No se encontró archivo de tipo ${type}`);
      }
      
      const fileInfo = files[0];
      
      // 3. Extraer la ruta relativa del archivo de la URL almacenada
      let filePath = fileInfo.file_url.split('/').slice(3).join('/');
      if (filePath.startsWith('consorcio-hub/')) {
        filePath = filePath.substring('consorcio-hub/'.length);
      }
      
      console.log(`[FilesController] Accediendo al archivo en ruta: ${filePath}`);
      
      // 4. Obtener el stream del archivo desde MinIO
      const fileStream = await this.filesService.getFileStreamFromMinio(filePath);
      
      // 5. Establecer los headers correctos para el tipo de contenido
      res.set({
        'Content-Type': fileInfo.mime_type || 'application/octet-stream',
        'Cache-Control': 'max-age=60'
      });
      
      // 6. Devolver el archivo como stream
      return new StreamableFile(fileStream);
    } catch (error) {
      console.error(`[FilesController] Error al servir archivo:`, error);
      res.status(404).send({
        error: true,
        message: `Error al obtener archivo: ${error.message}`
      });
      // Necesario para satisfacer el tipo de retorno Promise<StreamableFile>
      throw error; // Este throw asegura que la promesa sea rechazada y no continúe la ejecución
    }
  }

  @Get(':type')
  @Roles(UserRole.BUILDING_ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Obtener archivo por tipo' })
  @ApiResponse({
    status: 200,
    description: 'Archivo encontrado',
  })
  @ApiResponse({ status: 404, description: 'Archivo no encontrado' })
  @ApiParam({ name: 'buildingId', type: 'string', description: 'ID del edificio' })
  @ApiParam({ name: 'type', type: 'string', description: 'Tipo de archivo a buscar (ej: regulation)' })
  async getFileByType(
    @Param('buildingId') buildingId: string,
    @Param('type') type: string
  ) {
    try {
      console.log(`[FilesController] Obteniendo archivo de tipo: ${type} para building: ${buildingId}`);
      const file = await this.filesService.getFileByType(buildingId, type);
      
      if (!file) {
        console.log(`[FilesController] No se encontró archivo de tipo: ${type}`);
        return {
          error: true,
          message: `No se encontró archivo de tipo ${type}`,
          statusCode: 404
        };
      }
      
      // Si tenemos un archivo, vamos a asegurarnos de que la URL sea actual
      try {
        // Extraer el path relativo de la URL guardada
        // Asumiendo que la URL tiene el formato: https://<endpoint>/<bucket>/<path>
        // o http://<endpoint>:<port>/<bucket>/<path>
        let filePath = file.file_url.split('/').slice(3).join('/');
        
        // Si el path comienza con el nombre del bucket, eliminarlo
        if (filePath.startsWith('consorcio-hub/')) {
          filePath = filePath.substring('consorcio-hub/'.length);
        }
        
        console.log(`[FilesController] Generando URL presignada para path: ${filePath}`);
        
        // Actualizar la URL con una presignada fresca
        file.file_url = await this.filesService.generateFileUrl(filePath);
        console.log(`[FilesController] URL actualizada: ${file.file_url}`);
      } catch (urlError) {
        console.warn(`[FilesController] No se pudo actualizar la URL del archivo:`, urlError);
        // Continuar con la URL original si hay algún error
      }
      
      return file;
    } catch (error) {
      console.error(`[FilesController] Error al obtener archivo:`, error);
      return {
        error: true,
        message: error.message,
        statusCode: 500
      };
    }
  }
  
  @Get('regulation')
  @Roles(UserRole.BUILDING_ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Obtener el reglamento del edificio' })
  @ApiResponse({ status: 200, description: 'Reglamento encontrado' })
  @ApiResponse({ status: 404, description: 'Reglamento no encontrado' })
  @ApiParam({ name: 'buildingId', type: 'string', description: 'ID del edificio' })
  async getRegulation(@Param('buildingId') buildingId: string) {
    try {
      // Delegamos al método genérico con el tipo 'regulation'
      return this.getFileByType(buildingId, 'regulation');
    } catch (error) {
      console.error(`[FilesController] Error al obtener reglamento:`, error);
      return {
        error: true,
        message: error.message,
        statusCode: 500
      };
    }
  }

  @Post('upload')
  @Roles(UserRole.BUILDING_ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      // Añadimos opciones explícitas para el interceptor
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB límite de tamaño
      },
    })
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir un nuevo archivo' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        type: {
          type: 'string',
          example: 'regulation',
        },
        name: {
          type: 'string',
          example: 'Reglamento de Copropiedad',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Archivo subido correctamente',
  })
  async uploadFile(
    @Param('buildingId') buildingId: string,
    @Req() req,
    @UploadedFile() file: any,
    @Body() fileData: { type: string; name: string }
  ) {
    try {
      // Log detallado de lo que estamos recibiendo
      console.log('====== DEBUG UPLOAD ======');
      console.log('Headers recibidos:', JSON.stringify(req.headers));
      console.log('buildingId:', buildingId);
      console.log('file recibido:', file ? 'SÍ' : 'NO');
      if (file) {
        console.log('file.originalname:', file.originalname);
        console.log('file.mimetype:', file.mimetype);
        console.log('file.size:', file.size);
        console.log('file.buffer exists:', !!file.buffer);
      } else {
        console.log('PROBLEMA: file es NULL o undefined');
        console.log('Contenido de req.body:', JSON.stringify(req.body));
        console.log('Contenido de req.files:', req.files ? JSON.stringify(Object.keys(req.files)) : 'undefined');
      }
      console.log('fileData:', JSON.stringify(fileData));
      console.log('=========================');
      
      if (!file) {
        return {
          error: true,
          message: 'No se proporcionó ningún archivo',
          statusCode: 400,
          debug: {
            body: req.body,
            files: req.files,
            headers: req.headers
          }
        };
      }
      
      const userId = req.user.sub;
      
      const savedFile = await this.filesService.saveFile(
        buildingId,
        userId,
        file,
        {
          type: fileData.type,
          name: fileData.name
        }
      );
      
      return {
        message: 'Archivo subido correctamente',
        file: savedFile
      };
    } catch (error) {
      console.error(`[FilesController] Error al subir archivo:`, error);
      return {
        error: true,
        message: error.message,
        statusCode: 500
      };
    }
  }

  @Delete(':type')
  @Roles(UserRole.BUILDING_ADMIN)
  @ApiOperation({ summary: 'Eliminar archivo por tipo' })
  @ApiResponse({
    status: 200,
    description: 'Archivo eliminado correctamente',
  })
  @ApiParam({ name: 'buildingId', type: 'string', description: 'ID del edificio' })
  @ApiParam({ name: 'type', type: 'string', description: 'Tipo de archivo a eliminar (ej: regulation)' })
  async deleteFile(
    @Param('buildingId') buildingId: string,
    @Param('type') type: string
  ) {
    try {
      const result = await this.filesService.deleteFileByType(buildingId, type);
      return result;
    } catch (error) {
      console.error(`[FilesController] Error al eliminar archivo:`, error);
      return {
        error: true,
        message: error.message,
        statusCode: 500
      };
    }
  }
}
