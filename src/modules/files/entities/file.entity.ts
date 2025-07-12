import { ApiProperty } from '@nestjs/swagger';

export class File {
  @ApiProperty({ description: 'ID único del archivo', example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  id: string;

  @ApiProperty({ description: 'Tipo de archivo (ej: regulation, acta, manual)', example: 'regulation' })
  type: string;

  @ApiProperty({ description: 'Nombre identificativo del archivo', example: 'Reglamento de Copropiedad' })
  name: string;

  @ApiProperty({ description: 'ID del usuario que subió el archivo', example: '550e8400-e29b-41d4-a716-446655440000' })
  ownerId: string;

  @ApiProperty({ description: 'Nombre original del archivo', example: 'reglamento.pdf' })
  filename: string;

  @ApiProperty({ description: 'URL para acceder al archivo', example: 'http://minio-server/bucket/uuid-filename.pdf' })
  fileUrl: string;

  @ApiProperty({ description: 'Tamaño del archivo en bytes', example: 1048576 })
  fileSize: number;

  @ApiProperty({ description: 'Tipo MIME del archivo', example: 'application/pdf' })
  mimeType: string;

  @ApiProperty({ description: 'Indica si el archivo ha sido procesado', example: true })
  isProcessed: boolean;

  @ApiProperty({ description: 'Fecha de creación', example: '2025-07-08T00:00:00Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Fecha de última actualización', example: '2025-07-08T00:00:00Z' })
  updatedAt: Date;
}
