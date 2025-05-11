import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEmail, MinLength, Matches } from 'class-validator';

export class CompleteRegistrationDto {
  @ApiProperty({
    description: 'Token de verificación',
    example: 'abc123xyz789'
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    description: 'DNI del propietario',
    example: '12345678'
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{7,8}$/, {
    message: 'El DNI debe tener entre 7 y 8 dígitos'
  })
  dni: string;

  @ApiProperty({
    description: 'Email de recuperación',
    example: 'juan.perez@email.com'
  })
  @IsEmail()
  @IsNotEmpty()
  recoveryEmail: string;

  @ApiProperty({
    description: 'Contraseña',
    example: 'MiContraseña123!'
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
    message: 'La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial'
  })
  password: string;

  @ApiProperty({
    description: 'Código de verificación recibido por WhatsApp',
    example: 'ABC123'
  })
  @IsString()
  @IsNotEmpty()
  verifyCode: string;
}
