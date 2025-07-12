import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateRegulationDto {
  @ApiProperty({
    description: 'ID del edificio al que pertenece el reglamento (UUID)',
    example: 'ae7e4ef0-f7a3-48e5-ad9a-91edd0601828',
  })
  @IsString()
  buildingId: string;

  // El archivo se maneja a través de FileInterceptor en el controlador
}
