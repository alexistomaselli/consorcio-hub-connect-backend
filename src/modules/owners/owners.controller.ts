import { Controller, Post, Get, Body, Param, UseGuards, Req, NotFoundException, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OwnersService } from './owners.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SkipAuth } from '../auth/decorators/skip-auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { InviteOwnerDto } from './dto/invite-owner.dto';
import { CompleteRegistrationDto } from './dto/complete-registration.dto';
import { InvitationResult, VerificationResult, RegistrationResult } from './types';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';

@ApiTags('owners')
@Controller('owners')
export class OwnersController {
  constructor(private readonly ownersService: OwnersService, private readonly prismaService: PrismaService) {}
  
  @Get('debug/buildings/:buildingId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Diagnóstico de propietarios por edificio' })
  @ApiParam({ name: 'buildingId', description: 'ID del edificio' })
  async debugOwners(@Param('buildingId') buildingId: string) {
    // Verificamos si hay usuarios con rol OWNER
    const allOwners = await this.prismaService.user.findMany({
      where: {
        role: UserRole.OWNER
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true
      }
    });
    
    // Verificamos si hay relaciones BuildingOwner para este edificio
    const buildingOwners = await this.prismaService.buildingOwner.findMany({
      where: {
        buildingId: buildingId
      }
    });
    
    return {
      totalOwnersInSystem: allOwners.length,
      owners: allOwners,
      totalBuildingOwnerRelations: buildingOwners.length,
      buildingOwnerRelations: buildingOwners
    };
  }

  @Get('buildings/:buildingId/invitations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener invitaciones pendientes' })
  @ApiParam({ name: 'buildingId', description: 'ID del edificio' })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de invitaciones pendientes',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          whatsappNumber: { type: 'string' },
          units: { type: 'array', items: { type: 'string' } },
          status: { type: 'string', enum: ['PENDING_VALIDATION', 'VALIDATED', 'EXPIRED'] },
          createdAt: { type: 'string', format: 'date-time' },
          expiresAt: { type: 'string', format: 'date-time' }
        }
      }
    }
  })
  async getPendingInvitations(
    @Param('buildingId') buildingId: string
  ) {
    return this.ownersService.getPendingInvitations(buildingId);
  }

  @Get('buildings/:buildingId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener propietarios registrados' })
  @ApiParam({ name: 'buildingId', description: 'ID del edificio' })
  @ApiResponse({
    status: 200,
    description: 'Lista de propietarios registrados',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          documentType: { type: 'string', enum: ['DNI', 'PASSPORT', 'CUIT', 'CUIL', 'OTHER'] },
          documentNumber: { type: 'string' },
          email: { type: 'string' },
          whatsappNumber: { type: 'string' },
          units: { type: 'array', items: { type: 'string' } },
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] }
        }
      }
    }
  })
  async getRegisteredOwners(
    @Param('buildingId') buildingId: string
  ) {
    return this.ownersService.getRegisteredOwners(buildingId);
  }

  @Post('buildings/:buildingId/invite')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invitar a un propietario al edificio' })
  @ApiParam({ name: 'buildingId', description: 'ID del edificio' })
  @ApiResponse({ status: 201, description: 'Invitación enviada exitosamente' })
  @ApiResponse({
    status: 201,
    description: 'Invitación enviada exitosamente',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        token: { type: 'string' },
        verifyCode: { type: 'string' },
        expiresAt: { type: 'string', format: 'date-time' },
        message: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos o edificio sin WhatsApp configurado' })
  @ApiResponse({ status: 404, description: 'Edificio no encontrado' })
  async inviteOwner(
    @Param('buildingId') buildingId: string,
    @Body() inviteOwnerDto: InviteOwnerDto,
    @CurrentUser('sub') adminId: string
  ): Promise<InvitationResult> {
    return this.ownersService.inviteOwner(buildingId, inviteOwnerDto, adminId);
  }

  @Get('/verify/:token')
  @SkipAuth()
  @ApiOperation({ summary: 'Verificar token de invitación' })
  @ApiParam({ name: 'token', description: 'Token de verificación' })
  @ApiResponse({
    status: 200,
    description: 'Token verificado exitosamente',
    schema: {
      type: 'object',
      properties: {
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        whatsappNumber: { type: 'string' },
        unitNumber: { type: 'string' },
        isValid: { type: 'boolean' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Token inválido o expirado' })
  async verifyToken(@Param('token') token: string): Promise<VerificationResult> {
    return this.ownersService.verifyToken(token);
  }

  @Post('/complete-registration')
  @SkipAuth()
  @ApiOperation({ summary: 'Completar registro de propietario' })
  @ApiBody({ type: CompleteRegistrationDto })
  @ApiResponse({
    status: 201,
    description: 'Registro completado exitosamente',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        email: { type: 'string' },
        whatsappNumber: { type: 'string' },
        isProfileComplete: { type: 'boolean' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos o token expirado' })
  async completeRegistration(@Body() completeRegistrationDto: CompleteRegistrationDto): Promise<RegistrationResult> {
    return this.ownersService.completeRegistration(completeRegistrationDto);
  }
}
