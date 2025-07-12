import { ApiProperty } from '@nestjs/swagger';

export class RegulationResponseDto {
  @ApiProperty({
    description: 'ID único del reglamento',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'ID del edificio al que pertenece el reglamento',
    example: 1,
  })
  buildingId: number;

  @ApiProperty({
    description: 'Nombre original del archivo',
    example: 'Reglamento_Edificio_Aurora.pdf',
  })
  filename: string;

  @ApiProperty({
    description: 'URL para acceder al archivo',
    example: 'https://minio.consorcio-hub.com/regulations/building-1/reglamento.pdf',
  })
  fileUrl: string;

  @ApiProperty({
    description: 'Tamaño del archivo en bytes',
    example: 2048576,
  })
  fileSize: number;

  @ApiProperty({
    description: 'Tipo MIME del archivo',
    example: 'application/pdf',
  })
  mimeType: string;

  @ApiProperty({
    description: 'Fecha de subida del archivo',
    example: '2025-07-07T18:00:00Z',
  })
  uploadedAt: Date;

  @ApiProperty({
    description: 'Fecha de última actualización',
    example: '2025-07-07T18:00:00Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Indica si el documento ha sido procesado (OCR y embeddings)',
    example: false,
  })
  isProcessed: boolean;
}
