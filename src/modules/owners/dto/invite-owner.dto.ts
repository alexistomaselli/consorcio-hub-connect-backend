import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class InviteOwnerDto {
  @ApiProperty({
    description: 'Nombre del propietario',
    example: 'Juan'
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    description: 'Apellido del propietario',
    example: 'Pérez'
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    description: 'Número de WhatsApp del propietario',
    example: '+543388430068'
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'El número de WhatsApp debe estar en formato internacional (ej: +543388430068)'
  })
  whatsappNumber: string;

  @ApiProperty({
    description: 'Número de unidad',
    example: '2A'
  })
  @IsString()
  @IsNotEmpty()
  unitNumber: string;
}
