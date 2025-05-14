import { IsString, IsEmail, MinLength, MaxLength, IsIn, IsObject, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { BuildingDto } from '../dto/register.dto';

export class RegisterDto {
  @ApiProperty({
    description: 'Email del administrador',
    example: 'admin@edificio.com'
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Contraseña del administrador',
    example: 'Password123!'
  })
  @IsString()
  @MinLength(8)
  @MaxLength(50)
  password: string;

  @ApiProperty({
    description: 'Nombre del administrador',
    example: 'Juan'
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @ApiProperty({
    description: 'Apellido del administrador',
    example: 'Pérez'
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName: string;

  @ApiProperty({
    description: 'Información del edificio'
  })
  @IsObject()
  @ValidateNested()
  @Type(() => BuildingDto)
  building: BuildingDto;
}
