import { IsString, IsEmail, MinLength, MaxLength, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
    description: 'Nombre del edificio',
    example: 'Edificio San Martín'
  })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  buildingName: string;

  @ApiProperty({
    description: 'Nombre del plan seleccionado',
    example: 'Free',
    enum: ['Free', 'Basic', 'Pro']
  })
  @IsString()
  @IsIn(['Free', 'Basic', 'Pro'])
  planName: string;
}
