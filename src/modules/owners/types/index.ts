import { ApiProperty } from '@nestjs/swagger';

export class InvitationResult {
  @ApiProperty({
    description: 'ID de la invitación creada',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  id: string;

  @ApiProperty({
    description: 'Token de verificación',
    example: 'abc123xyz789'
  })
  token: string;

  @ApiProperty({
    description: 'Código de verificación enviado por WhatsApp',
    example: 'ABC123'
  })
  verifyCode: string;

  @ApiProperty({
    description: 'Fecha de expiración del token',
    example: '2025-05-09T15:26:57.000Z'
  })
  expiresAt: Date;

  @ApiProperty({
    description: 'Mensaje de éxito',
    example: 'Invitación enviada exitosamente'
  })
  message: string;
}

export class VerificationResult {
  @ApiProperty({
    description: 'Indica si el token es válido',
    example: true
  })
  isValid: boolean;

  @ApiProperty({
    description: 'Nombre del propietario',
    example: 'Juan'
  })
  firstName: string;

  @ApiProperty({
    description: 'Apellido del propietario',
    example: 'Pérez'
  })
  lastName: string;

  @ApiProperty({
    description: 'Número de WhatsApp del propietario',
    example: '+543388430068'
  })
  whatsappNumber: string;

  @ApiProperty({
    description: 'Número de unidad',
    example: '2A'
  })
  unitNumber: string;
}

export class RegistrationResult {
  @ApiProperty({
    description: 'ID del usuario creado',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  id: string;

  @ApiProperty({
    description: 'Email de recuperación',
    example: 'juan.perez@email.com'
  })
  email: string;

  @ApiProperty({
    description: 'Número de WhatsApp',
    example: '+543388430068'
  })
  whatsappNumber: string;

  @ApiProperty({
    description: 'Indica si el perfil está completo',
    example: true
  })
  isProfileComplete: boolean;
}
