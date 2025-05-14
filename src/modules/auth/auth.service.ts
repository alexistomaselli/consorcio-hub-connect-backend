import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { AuthResponse } from './interfaces/auth-response.interface';
import { N8nWebhookService } from '../n8n/n8n-webhook.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserWithBuildings, UserWithBuildingRelations } from '../users/types/user.types';
import { UsersService } from '../users/users.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { addHours } from 'date-fns';
import { EmailVerification, UserRole, Prisma, PlanType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { EmailVerificationWithTempData } from './types/email-verification.types';

@Injectable()
export class AuthService {
  private readonly TRIAL_PERIOD_DAYS = 14;
  private readonly VERIFICATION_CODE_EXPIRY_MINUTES = 30;
  private readonly VERIFICATION_CODE_LENGTH = 6;

  private generateVerificationCode(): string {
    return Math.random().toString().slice(2, 2 + this.VERIFICATION_CODE_LENGTH);
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  private async createBuildingSchema(prisma: Prisma.TransactionClient, schemaName: string) {
    try {
      // Crear el schema
      await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}";`);
      
      // Aquí podemos agregar la creación de tablas específicas del building si es necesario
      // Por ejemplo:
      // await prisma.$executeRawUnsafe(`
      //   CREATE TABLE "${schemaName}".expenses (
      //     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      //     ...
      //   );
      // `);
    } catch (error) {
      console.error('Error al crear el schema del building:', error);
      throw new BadRequestException('Error al crear el schema del building');
    }
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly n8nWebhookService: N8nWebhookService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly whatsappService: WhatsappService,
  ) {}

  async authenticate(credentials: AuthCredentialsDto): Promise<AuthResponse> {
    if (credentials.identifierType === 'WHATSAPP') {
      return this.validateUserByWhatsApp(credentials.identifier);
    } else {
      throw new BadRequestException('Método de autenticación no soportado');
    }
  }

  async validateUserByWhatsApp(identifier: string): Promise<AuthResponse> {
    try {
      const user = await this.prisma.user.findFirst({
        where: { whatsappNumber: identifier },
        include: {
          managedBuildings: {
            include: {
              plan: true
            }
          },
          emailVerifications: true
        }
      });

      if (!user) {
        throw new UnauthorizedException('Usuario no encontrado');
      }

      if (!user.managedBuildings || user.managedBuildings.length === 0) {
        throw new UnauthorizedException('Usuario sin edificios asignados');
      }

      const building = user.managedBuildings[0];

      const payload = { sub: user.id, whatsappNumber: user.whatsappNumber };
      const access_token = await this.jwtService.signAsync(payload);

      return {
        access_token,
        user: {
          ...user,
          managedBuildings: user.managedBuildings,
          emailVerifications: user.emailVerifications || []
        } as UserWithBuildings,
        building,
        trialEndsAt: building.trialEndsAt,
        requiresVerification: false
      };
    } catch (error) {
      throw new UnauthorizedException('Error al validar usuario');
    }
  }



  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { email, password } = loginDto;
    
    const userResult = await this.prisma.user.findUnique({
      where: { email },
      include: {
        managedBuildings: {
          include: {
            plan: true
          }
        },
        emailVerifications: true
      }
    });

    if (!userResult) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const user = {
      ...userResult,
      managedBuildings: userResult.managedBuildings || [],
      emailVerifications: userResult.emailVerifications || []
    } as UserWithBuildings;

    if (!user.password) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = { sub: user.id, email: user.email };
    const access_token = await this.jwtService.signAsync(payload);

    return {
      access_token,
      user,
      building: user.managedBuildings?.[0] || null,
      trialEndsAt: user.managedBuildings?.[0]?.trialEndsAt || null,
      requiresVerification: false
    };
  }

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    try {
      const { email, password, firstName, lastName, building } = registerDto;

      // Verificar que el email no está en uso
      const existingUser = await this.prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        throw new BadRequestException('El email ya está en uso');
      }

      // Crear o obtener el plan gratuito
      let freePlan = await this.prisma.plan.findFirst({
        where: { type: PlanType.FREE }
      });

      if (!freePlan) {
        freePlan = await this.prisma.plan.create({
          data: {
            type: PlanType.FREE,
            name: 'Plan Gratuito',
            description: 'Plan inicial gratuito',
            price: 0,
            features: ['Gestión básica de edificios', 'Comunicación por WhatsApp']
          }
        });
      }

      const result = await this.prisma.$transaction(async (prisma) => {
        // Crear el usuario
        const user = await prisma.user.create({
          data: {
            email,
            password: await bcrypt.hash(password, 10),
            firstName,
            lastName,
            role: UserRole.BUILDING_ADMIN
          },
          include: {
            emailVerifications: true
          }
        });

        // Crear el edificio con schema temporal
        const newBuilding = await prisma.building.create({
          data: {
            name: building.name,
            address: building.address,
            schema: 'temp_schema', // Temporal, será actualizado
            admin: {
              connect: {
                id: user.id
              }
            },
            plan: {
              connect: {
                id: freePlan.id
              }
            },
            trialEndsAt: new Date(Date.now() + this.TRIAL_PERIOD_DAYS * 24 * 60 * 60 * 1000)
          },
          include: {
            plan: true
          }
        });

        // Actualizar el building con el schema correcto
        const schemaName = `building_${newBuilding.id}`;
        const updatedBuilding = await prisma.building.update({
          where: { id: newBuilding.id },
          data: {
            schema: schemaName
          },
          include: {
            plan: true
          }
        });

        // Crear el schema físicamente en la base de datos
        await this.createBuildingSchema(prisma, schemaName);

        // Crear verificación de email
        const verificationCode = this.generateVerificationCode();
        const expiresAt = new Date(Date.now() + this.VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000);

        const emailVerification = await prisma.emailVerification.create({
          data: {
            email,
            userId: user.id,
            verificationCode,
            expiresAt,
            isVerified: false
          }
        });

        return { user, building: updatedBuilding, emailVerification };
      });

      // Enviar email de verificación
      try {
        const webhook = await this.n8nWebhookService.getWebhook('email_send_verification');
        if (!webhook) {
          throw new Error('Webhook no encontrado');
        }

        const verifyEmailUrl = `${this.configService.get('FRONTEND_URL')}/verify-email`;
        const verificationCode = result.emailVerification.verificationCode;
        const htmlMessage = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="https://consorcio-hub.com/logo.png" alt="ConsorcioHub" style="max-width: 200px; height: auto;">
            </div>
            
            <h1 style="color: #2c3e50; text-align: center; margin-bottom: 30px;">Verificación de Email</h1>
            
            <p style="color: #34495e; font-size: 16px; line-height: 1.5;">Hola ${result.user.firstName},</p>
            
            <p style="color: #34495e; font-size: 16px; line-height: 1.5;">Para completar la verificación de tu cuenta en ConsorcioHub, por favor ingresa el siguiente código:</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2c3e50;">${verificationCode}</span>
            </div>
            
            <p style="color: #34495e; font-size: 16px; line-height: 1.5;">O simplemente haz clic en el siguiente botón:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verifyEmailUrl}" style="display: inline-block; background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px;">Verificar Email</a>
            </div>
            
            <p style="color: #7f8c8d; font-size: 14px;">Este código expirará en ${this.VERIFICATION_CODE_EXPIRY_MINUTES} minutos.</p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <div style="color: #7f8c8d; font-size: 12px; text-align: center;">
              <p>Este email fue enviado por ConsorcioHub</p>
              <p>Si no solicitaste este código, puedes ignorar este mensaje.</p>
              <p>© ${new Date().getFullYear()} ConsorcioHub. Todos los derechos reservados.</p>
              <p>Av. Corrientes 123, CABA, Argentina</p>
            </div>
          </div>
        `;

        const response = await fetch(webhook.prodUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userEmail: email,
            subject: 'Verificación de Email - ConsorcioHub',
            message: htmlMessage
          })
        });

        if (!response.ok) {
          throw new Error('Error al enviar el email');
        }

        // Generar token JWT
        const payload = { sub: result.user.id, email: result.user.email };
        const access_token = await this.jwtService.signAsync(payload);

        return {
          access_token,
          user: {
            ...result.user,
            emailVerifications: [result.emailVerification]
          },
          building: result.building,
          trialEndsAt: result.building.trialEndsAt,
          requiresVerification: true
        };
      } catch (error) {
        console.error('Error al enviar email:', error);
        throw new BadRequestException('Error al enviar el email de verificación');
      }
    } catch (error) {
      console.error('Error en el registro:', error);
      throw new BadRequestException(error.message || 'Error al completar el registro');
    }
  }

  async registerUser(registerDto: RegisterUserDto): Promise<AuthResponse> {
    const { email, password, firstName, lastName, buildingId, unitNumber } = registerDto;

    // Verificar si el edificio existe
    const building = await this.prisma.building.findUnique({
      where: { id: buildingId },
      include: { plan: true }
    });

    if (!building) {
      throw new BadRequestException('Edificio no encontrado');
    }

    // Verificar si ya existe un usuario con ese email
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      include: {
        managedBuildings: {
          include: {
            plan: true
          }
        },
        emailVerifications: true
      }
    });

    if (existingUser) {
      throw new BadRequestException('El email ya está registrado');
    }

    // Crear el usuario y la relación con el edificio en una transacción
    const result = await this.prisma.$transaction(async (prisma) => {
      if (!password) {
        throw new BadRequestException('La contraseña es requerida');
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          role: 'OWNER',
          primaryAuthMethod: 'EMAIL',
          isProfileComplete: true
        },
        include: {
          managedBuildings: {
            include: {
              plan: true
            }
          },
          emailVerifications: true
        }
      });

      // Crear la relación owner-building
      if (!unitNumber) {
        throw new BadRequestException('El número de unidad es requerido para propietarios');
      }

      await prisma.buildingOwner.create({
        data: {
          userId: user.id,
          buildingId,
          unitNumber,
          isVerified: true
        }
      });

      return { user, building };
    });

    // Generar token JWT
    const token = await this.jwtService.signAsync({
      userId: result.user.id,
      role: result.user.role
    });

    return {
      access_token: token,
      user: result.user,
      building: result.building,
      trialEndsAt: null,
      requiresVerification: false
    };
  }

  async verifyEmail(email: string, code: string): Promise<AuthResponse> {
    const emailVerification = await this.prisma.emailVerification.findFirst({
      where: { email, verificationCode: code }
    });

    if (!emailVerification) {
      throw new BadRequestException('Código de verificación inválido');
    }

    if (emailVerification.isVerified) {
      throw new BadRequestException('El email ya fue verificado');
    }

    if (new Date() > emailVerification.expiresAt) {
      throw new BadRequestException('El código de verificación ha expirado');
    }

    try {
      // Actualizar la verificación
      await this.prisma.emailVerification.update({
        where: { id: emailVerification.id },
        data: { isVerified: true }
      });

      // Obtener el usuario actualizado
      const user = await this.prisma.user.findUnique({
        where: { email },
        include: {
          managedBuildings: {
            include: {
              plan: true
            }
          },
          emailVerifications: true
        }
      });

      if (!user) {
        throw new BadRequestException('Usuario no encontrado');
      }

      const token = await this.jwtService.signAsync({
        sub: user.id,
        email: user.email
      });

      return {
        access_token: token,
        user: {
          ...user,
          managedBuildings: user.managedBuildings || [],
          emailVerifications: user.emailVerifications || []
        } as UserWithBuildings,
        building: user.managedBuildings?.[0] || null,
        trialEndsAt: user.managedBuildings?.[0]?.trialEndsAt || null,
        requiresVerification: false
      };
    } catch (error) {
      console.error(error);
      throw new BadRequestException('Error al verificar el email');
    }
  }

  async resendVerificationCode(email: string): Promise<void> {
    // Verificar si el usuario existe
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { emailVerifications: true }
    });

    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    // Verificar si ya está verificado
    const existingVerification = user.emailVerifications?.[0];
    if (existingVerification?.isVerified) {
      throw new BadRequestException('El email ya está verificado');
    }

    // Verificar si hay un código reciente (menos de 5 minutos)
    if (existingVerification && existingVerification.expiresAt > new Date()) {
      const timeDiff = existingVerification.expiresAt.getTime() - new Date().getTime();
      const minutesLeft = Math.ceil(timeDiff / (1000 * 60));
      throw new BadRequestException(
        `Debes esperar ${minutesLeft} minutos antes de solicitar un nuevo código`
      );
    }

    // Generar nuevo código
    const verificationCode = this.generateVerificationCode();
    const expiresAt = new Date(Date.now() + this.VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000);

    // Actualizar o crear verificación
    const emailVerification = await this.prisma.emailVerification.upsert({
      where: { email },
      update: {
        verificationCode,
        expiresAt,
        isVerified: false
      },
      create: {
        email,
        userId: user.id,
        verificationCode,
        expiresAt,
        isVerified: false
      }
    });

    // Enviar email con el nuevo código
    try {
      const webhook = await this.n8nWebhookService.getWebhook('email_send_verification');
      if (!webhook) {
        throw new Error('Webhook no encontrado');
      }

      const verifyEmailUrl = `${this.configService.get('FRONTEND_URL')}/verify-email`;
      const htmlMessage = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="https://consorcio-hub.com/logo.png" alt="ConsorcioHub" style="max-width: 200px; height: auto;">
          </div>
          
          <h1 style="color: #2c3e50; text-align: center; margin-bottom: 30px;">Verificación de Email</h1>
          
          <p style="color: #34495e; font-size: 16px; line-height: 1.5;">Hola,</p>
          
          <p style="color: #34495e; font-size: 16px; line-height: 1.5;">Para completar la verificación de tu cuenta en ConsorcioHub, por favor ingresa el siguiente código:</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2c3e50;">${verificationCode}</span>
          </div>
          
          <p style="color: #34495e; font-size: 16px; line-height: 1.5;">O simplemente haz clic en el siguiente botón:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyEmailUrl}" style="display: inline-block; background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px;">Verificar Email</a>
          </div>
          
          <p style="color: #7f8c8d; font-size: 14px;">Este código expirará en ${this.VERIFICATION_CODE_EXPIRY_MINUTES} minutos.</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <div style="color: #7f8c8d; font-size: 12px; text-align: center;">
            <p>Este email fue enviado por ConsorcioHub</p>
            <p>Si no solicitaste este código, puedes ignorar este mensaje.</p>
            <p>© ${new Date().getFullYear()} ConsorcioHub. Todos los derechos reservados.</p>
            <p>Av. Corrientes 123, CABA, Argentina</p>
          </div>
        </div>
      `;

      const response = await fetch(webhook.prodUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: email,
          subject: 'Verificación de Email - ConsorcioHub',
          message: htmlMessage
        })
      });

      if (!response.ok) {
        throw new Error('Error al enviar el email');
      }
    } catch (error) {
      console.error('Error al enviar email de verificación:', error);
      throw new BadRequestException('Error al enviar el email de verificación');
    }
  }
}
