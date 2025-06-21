import { IsString, IsEmail, IsNotEmpty, IsOptional, MinLength, MaxLength, ValidateIf, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class RegisterUserDto {
  @ApiProperty({
    description: 'Rol del usuario',
    enum: UserRole,
    example: UserRole.OWNER
  })
  @IsNotEmpty()
  role: UserRole;
  @ApiProperty({
    description: 'Nombre del propietario',
    example: 'Juan',
    minLength: 2,
    maxLength: 50
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @ApiProperty({
    description: 'Apellido del propietario',
    example: 'Pérez',
    minLength: 2,
    maxLength: 50
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  lastName: string;

  @ApiProperty({
    description: 'Email del usuario',
    example: 'juan.perez@ejemplo.com',
    required: false
  })
  @IsEmail()
  @ValidateIf((o) => o.role === UserRole.BUILDING_ADMIN || o.email)
  @IsNotEmpty()
  email?: string;

  @ApiProperty({
    description: 'Contraseña del usuario',
    example: 'Password123!',
    minLength: 8,
    maxLength: 50,
    required: false
  })
  @IsString()
  @ValidateIf((o) => o.role === UserRole.BUILDING_ADMIN || o.password)
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(50)
  password?: string;

  @ApiProperty({
    description: 'Número de WhatsApp',
    example: '+5491112345678',
    required: false
  })
  @IsString()
  @ValidateIf((o) => o.role === UserRole.OWNER && !o.email)
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'El número de WhatsApp debe estar en formato internacional (ej: +5491112345678)'
  })
  whatsappNumber?: string;

  @ApiProperty({
    description: 'ID del edificio al que pertenece',
    example: 'a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6'
  })
  @IsString()
  @IsNotEmpty()
  buildingId: string;

  @ApiProperty({
    description: 'Número o identificador de la unidad',
    example: '3B',
    required: false
  })
  @IsString()
  @IsOptional()
  unitNumber?: string;
}
