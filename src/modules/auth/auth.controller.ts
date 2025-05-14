import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dtos/register.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';

@ApiTags('auth')
@Controller('auth')
@ApiResponse({ status: 401, description: 'No autorizado' })
@ApiResponse({ status: 403, description: 'Prohibido' })
@ApiResponse({ status: 500, description: 'Error interno del servidor' })
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  @Post('authenticate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Autenticación genérica',
    description: 'Inicia sesión usando email o WhatsApp'
  })
  @ApiResponse({
    status: 200,
    description: 'Autenticación exitosa o requiere verificación',
    schema: {
      properties: {
        requiresVerification: { type: 'boolean' },
        verificationSent: { type: 'boolean' },
        token: { type: 'string', description: 'Token JWT (si la autenticación es exitosa)' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: { type: 'string' }
          }
        }
      }
    }
  })
  async authenticate(@Body() credentials: AuthCredentialsDto) {
    return this.authService.authenticate(credentials);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Iniciar sesión (legacy)',
    description: 'Inicia sesión con email y contraseña (método anterior)'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Login exitoso',
    schema: {
      properties: {
        access_token: { type: 'string', description: 'Token JWT para autenticación' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: { type: 'string', enum: ['SUPER_ADMIN', 'BUILDING_ADMIN', 'OWNER', 'SERVICE_PROVIDER'] },
            buildingId: { type: 'string', format: 'uuid' },
            buildingName: { type: 'string' },
            isProfileComplete: { type: 'boolean' }
          }
        }
      }
    }
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  @ApiOperation({
    summary: 'Registrar nuevo edificio',
    description: 'Registra un nuevo edificio con su administrador y plan. Inicia un período de prueba de 14 días si el plan es gratuito.'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Registro exitoso',
    schema: {
      properties: {
        access_token: { type: 'string', description: 'Token JWT para autenticación' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: { type: 'string', enum: ['BUILDING_ADMIN'] },
            isProfileComplete: { type: 'boolean' }
          }
        },
        building: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            plan: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['FREE', 'BASIC', 'PRO'] },
                name: { type: 'string' },
                features: { type: 'array', items: { type: 'string' } }
              }
            }
          }
        },
        trialEndsAt: { type: 'string', format: 'date-time', description: 'Fecha de finalización del período de prueba' }
      }
    }
  })
  @ApiResponse({ status: 409, description: 'El email ya está registrado' })
  async register(@Body() registerDto: RegisterDto) {
    try {
      console.log('Received registration request:', registerDto);
      const result = await this.authService.register(registerDto);
      console.log('Registration successful');
      return result;
    } catch (error) {
      console.error('Error during registration:', error);
      throw error;
    }
  }

  @Post('register-user')
  @ApiOperation({
    summary: 'Registrar nuevo propietario',
    description: 'Registra un nuevo propietario en un edificio existente'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Registro exitoso',
    schema: {
      properties: {
        access_token: { type: 'string', description: 'Token JWT para autenticación' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: { type: 'string', enum: ['OWNER'] },
            buildingId: { type: 'string', format: 'uuid' },
            buildingName: { type: 'string' },
            unitNumber: { type: 'string', nullable: true },
            isProfileComplete: { type: 'boolean' }
          }
        },
        building: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            plan: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['FREE', 'BASIC', 'PRO'] },
                name: { type: 'string' },
                features: { type: 'array', items: { type: 'string' } }
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 409, description: 'El email ya está registrado' })
  @ApiResponse({ status: 404, description: 'Edificio no encontrado' })
  async registerUser(@Body() registerDto: RegisterUserDto) {
    return this.authService.registerUser(registerDto);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verificar email',
    description: 'Verifica el email del usuario usando el código enviado'
  })
  @ApiResponse({
    status: 200,
    description: 'Email verificado exitosamente',
    schema: {
      properties: {
        verified: { type: 'boolean' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Código inválido o expirado' })
  async verifyEmail(
    @Body('email') email: string,
    @Body('code') code: string
  ) {
    const verified = await this.authService.verifyEmail(email, code);
    return { verified };
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reenviar código de verificación',
    description: 'Reenvía el código de verificación al email del usuario'
  })
  @ApiResponse({
    status: 200,
    description: 'Código reenviado exitosamente',
    schema: {
      properties: {
        sent: { type: 'boolean' },
        message: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Error al reenviar el código' })
  async resendVerification(
    @Body('email') email: string
  ) {
    await this.authService.resendVerificationCode(email);
    return { 
      sent: true,
      message: 'Código de verificación reenviado exitosamente'
    };
  }
}
