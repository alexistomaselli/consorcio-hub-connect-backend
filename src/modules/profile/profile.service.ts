import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CompleteProfileDto } from './dto/complete-profile.dto';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  private validateRequiredFields(data: CompleteProfileDto): boolean {
    // Campos requeridos para el edificio
    const requiredBuildingFields = [
      data.buildingName,
      data.address,
      data.floors,
      data.totalUnits,
      data.phoneNumber,
      data.email,
    ];

    // Campos requeridos para el administrador
    const requiredAdminFields = [
      data.adminFirstName,
      data.adminLastName,
      data.adminPhone,
    ];

    // Verificar que todos los campos requeridos tengan valor
    return [
      ...requiredBuildingFields,
      ...requiredAdminFields
    ].every(field => field !== undefined && field !== '');
  }

  async completeProfile(userId: string, data: CompleteProfileDto) {
    // Obtener el edificio administrado por el usuario
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        managedBuildings: true
      }
    });

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    const building = await this.prisma.building.findFirst({
      where: { adminId: user.id }
    });

    if (!building) {
      throw new BadRequestException('El usuario no administra ningún edificio');
    }

    // Verificar campos requeridos
    const isComplete = this.validateRequiredFields(data);

    // Actualizar el edificio en el schema público
    const updatedBuilding = await this.prisma.building.update({
      where: { id: building.id },
      data: {
        name: data.buildingName,
        address: data.address,
        floors: parseInt(data.floors),
        totalUnits: parseInt(data.totalUnits),
        constructionYear: data.constructionYear ? parseInt(data.constructionYear) : undefined,
        phoneNumber: data.phoneNumber,
        whatsapp: data.whatsapp,
        email: data.email,
        website: data.website,
        description: data.description,
        isProfileComplete: true,
      },
      include: {
        plan: true
      }
    });

    // Actualizar el usuario administrador
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: data.adminFirstName,
        lastName: data.adminLastName,
        phoneNumber: data.adminPhone,
        isProfileComplete: true,
      },
    });

    return {
      user: updatedUser,
      building: updatedBuilding,
    };
  }
}
