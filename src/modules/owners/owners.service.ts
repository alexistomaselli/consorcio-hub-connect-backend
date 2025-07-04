import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InviteOwnerDto } from './dto/invite-owner.dto';
import { CompleteRegistrationDto } from './dto/complete-registration.dto';
import { InvitationResult, VerificationResult, RegistrationResult, Owner, PendingInvitation } from './types';
import { WhatsAppService } from '../buildings/whatsapp.service';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { UserRole, Prisma } from '@prisma/client';

@Injectable()
export class OwnersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsAppService
  ) {}

  async getPendingInvitations(buildingId: string): Promise<PendingInvitation[]> {
    const invitations = await this.prisma.ownerVerification.findMany({
      where: {
        buildingId,
        isUsed: false
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return invitations.map(inv => ({
      id: inv.id,
      firstName: inv.firstName,
      lastName: inv.lastName,
      whatsappNumber: inv.whatsappNumber,
      unitNumber: inv.unitNumber,
      expiresAt: inv.expiresAt.toISOString()
    }));
  }

  async getRegisteredOwners(buildingId: string): Promise<Owner[]> {
    // Consulta utilizando la tabla 'users' y su relación 'buildings' correctamente
    const owners = await this.prisma.user.findMany({
      where: {
        role: UserRole.OWNER,
        buildings: {
          some: {
            buildingId: buildingId
          }
        }
      },
      include: {
        buildings: {
          where: {
            buildingId: buildingId
          }
        }
      },
      orderBy: {
        firstName: 'asc'
      }
    });

    // Mapear los resultados al formato esperado por el frontend
    return owners.map(owner => ({
      id: owner.id,
      firstName: owner.firstName || '',
      lastName: owner.lastName || '',
      email: owner.email || '',
      phoneNumber: owner.phoneNumber || undefined,
      whatsappNumber: owner.phoneNumber || undefined,
      ownedBuildings: owner.buildings.map(buildingOwner => ({
        unitNumber: buildingOwner.unitNumber || '',
        isVerified: buildingOwner.isVerified || false
      }))
    }));
  }

  async inviteOwner(buildingId: string, dto: InviteOwnerDto, adminId: string): Promise<InvitationResult> {
    console.log('Inviting owner with params:', { buildingId, adminId, dto });

    if (!adminId) {
      throw new UnauthorizedException('Se requiere autenticación');
    }

    // 1. Verificar que el edificio existe y tiene WhatsApp configurado
    const building = await this.prisma.building.findUnique({
      where: { id: buildingId },
      include: { 
        whatsappInstance: true,
        admin: true
      }
    });

    console.log('Building found:', building);

    if (!building) {
      throw new NotFoundException('Edificio no encontrado');
    }

    // Verificar que el admin tiene permisos
    if (building.adminId !== adminId) {
      console.log('Permission denied - adminId mismatch:', { buildingAdminId: building.adminId, requestAdminId: adminId });
      throw new UnauthorizedException('No tienes permisos para invitar propietarios en este edificio');
    }

    if (!building.whatsappInstance) {
      throw new BadRequestException('El edificio no tiene WhatsApp configurado');
    }

    // Verificar que existe la instancia en la base de datos
    if (!building.whatsappInstance) {
      throw new BadRequestException('El edificio no tiene WhatsApp configurado');
    }

    // Generar token temporal y código de verificación
    const tempToken = randomBytes(32).toString('hex');
    const verifyCode = Math.random().toString().slice(2, 8); // Código de 6 dígitos más fácil de leer

    // Verificar si ya existe una invitación activa para esta unidad
    const existingInvitation = await this.prisma.ownerVerification.findFirst({
      where: {
        buildingId,
        unitNumber: dto.unitNumber,
        isUsed: false,
        expiresAt: {
          gt: new Date()
        }
      }
    });

    console.log('Existing invitation:', existingInvitation);

    if (existingInvitation) {
      // Vamos a permitir reenviar la invitación si existe
      await this.prisma.ownerVerification.update({
        where: { id: existingInvitation.id },
        data: { isUsed: true }
      });
    }

    // Crear verificación en la base de datos
    const verification = await this.prisma.ownerVerification.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        whatsappNumber: dto.whatsappNumber,
        unitNumber: dto.unitNumber,
        tempToken,
        verifyCode,
        buildingId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
        isUsed: false,
      },
    });

    // Enviar mensaje de WhatsApp
    // Asegurarnos de que la URL use http:// incluso si WhatsApp intenta convertirla
    const verificationUrl = `${process.env.FRONTEND_URL}/register/owner/${tempToken}`;
    const urlMessage = `Para acceder usa esta dirección (reemplaza https:// por http:// si es necesario):\n${verificationUrl}`;
    const message = `¡Hola ${dto.firstName}! Has sido invitado como propietario en ${building.name}.\n\n` +
                   `${urlMessage}\n\n` +
                   `Tu código de verificación es: ${verifyCode}\n\n` +
                   `Este link expira en 24 horas.`;

    console.log('Enviando mensaje de WhatsApp a:', dto.whatsappNumber);
    try {
      // Usar el método correcto: sendTextMessage (que toma buildingId primero, luego to, luego message)
      await this.whatsappService.sendTextMessage(buildingId, dto.whatsappNumber, message);
    } catch (error) {
      console.warn('Error al enviar mensaje de WhatsApp:', error.message);
      console.log('Continuando con el proceso de invitación a pesar del error de WhatsApp');
      // En desarrollo, permitimos que el flujo continúe incluso si falla el envío del mensaje de WhatsApp
      // En producción, este error debería ser manejado apropiadamente
      if (process.env.NODE_ENV === 'production') {
        throw new Error('No se pudo enviar el mensaje de invitación por WhatsApp');
      }
    }

    return {
      id: verification.id,
      token: tempToken,
      verifyCode,
      expiresAt: verification.expiresAt,
      message: 'Invitación enviada exitosamente',
    };
  }

  async verifyToken(token: string): Promise<VerificationResult> {
    const verification = await this.prisma.ownerVerification.findUnique({
      where: { tempToken: token },
    });

    if (!verification || verification.isUsed || verification.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired token');
    }

    return {
      firstName: verification.firstName,
      lastName: verification.lastName,
      whatsappNumber: verification.whatsappNumber,
      unitNumber: verification.unitNumber,
      isValid: true,
    };
  }

  async completeRegistration(dto: CompleteRegistrationDto): Promise<RegistrationResult> {
    // Verificar que el token es válido y no ha expirado
    const verification = await this.prisma.ownerVerification.findUnique({
      where: { tempToken: dto.token },
    });

    if (!verification || verification.isUsed || verification.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired token');
    }

    if (verification.verifyCode !== dto.verifyCode) {
      throw new BadRequestException('Invalid verification code');
    }

    // Verificar que el DNI no está en uso
    const existingUser = await this.prisma.user.findFirst({
      where: {
        dni: dto.dni,
      } as Prisma.UserWhereInput,
    });

    if (existingUser) {
      throw new BadRequestException('DNI already in use');
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Crear usuario
    const user = await this.prisma.user.create({
      data: {
        firstName: verification.firstName,
        lastName: verification.lastName,
        phoneNumber: verification.whatsappNumber,
        dni: dto.dni,
        email: dto.recoveryEmail,
        recoveryEmail: dto.recoveryEmail,
        password: hashedPassword,
        role: UserRole.OWNER,
        isProfileComplete: true,
        unitNumber: verification.unitNumber,
        ownedBuildings: {
          create: {
            buildingId: verification.buildingId,
            unitNumber: verification.unitNumber,
            isVerified: true,
          },
        },
      } as Prisma.UserCreateInput,
    });

    // Marcar verificación como usada
    await this.prisma.ownerVerification.update({
      where: { id: verification.id },
      data: { isUsed: true },
    });

    return {
      id: user.id,
      email: user.email,
      whatsappNumber: user.phoneNumber || '',
      isProfileComplete: user.isProfileComplete,
    } as RegistrationResult;
  }

  /**
   * Obtiene los edificios asociados a un propietario
   * @param userId ID del usuario propietario
   * @returns Lista de edificios asociados al propietario
   */
  async getOwnerBuildings(userId: string) {
    // Verificar que el usuario existe y es un propietario
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (user.role !== UserRole.OWNER) {
      throw new BadRequestException('El usuario no es un propietario');
    }

    // Obtener las relaciones building-owner para este usuario
    const buildingOwnerRelations = await this.prisma.buildingOwner.findMany({
      where: {
        userId: userId,
      },
      include: {
        building: true,
      },
    });

    // Transformar los resultados al formato esperado por el frontend
    return buildingOwnerRelations.map(relation => ({
      id: relation.building.id,
      name: relation.building.name,
      address: relation.building.address,
      unitNumber: relation.unitNumber,
      isVerified: relation.isVerified,
      logo: relation.building.logo || null,
    }));
  }
}
