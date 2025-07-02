import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateServiceTypeDto } from './dto/create-service-type.dto';
import { CreateProviderDto } from './dto/create-provider.dto';
import { QueryProvidersDto } from './dto/query-providers.dto';
import { AddBuildingProviderDto } from './dto/add-building-provider.dto';
import { Prisma } from '@prisma/client';
import { ProviderStatus } from './enum/provider-status.enum';

@Injectable()
export class ProvidersService {
  constructor(private prisma: PrismaService) {}

  async getServiceTypes(search?: string) {
    return this.prisma.serviceType.findMany({
      where: search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      } : undefined,
      orderBy: {
        name: 'asc',
      },
    });
  }

  async getServiceTypeById(id: string) {
    const serviceType = await this.prisma.serviceType.findUnique({
      where: { id }
    });

    if (!serviceType) {
      throw new NotFoundException('Service type not found');
    }

    return serviceType;
  }

  async updateServiceType(id: string, { name, description }: CreateServiceTypeDto) {
    const existing = await this.prisma.serviceType.findUnique({
      where: { id }
    });

    if (!existing) {
      throw new NotFoundException('Service type not found');
    }

    // Verificar si el nuevo nombre ya existe (si se está cambiando)
    if (name !== existing.name) {
      const nameExists = await this.prisma.serviceType.findUnique({
        where: { name }
      });

      if (nameExists) {
        throw new BadRequestException('Service type name already exists');
      }
    }

    return this.prisma.serviceType.update({
      where: { id },
      data: { name, description }
    });
  }

  async deleteServiceType(id: string) {
    const existing = await this.prisma.serviceType.findUnique({
      where: { id },
      include: {
        providers: true
      }
    });

    if (!existing) {
      throw new NotFoundException('Service type not found');
    }

    if (existing.providers.length > 0) {
      throw new BadRequestException('Cannot delete service type that has associated providers');
    }

    return this.prisma.serviceType.delete({
      where: { id }
    });
  }

  async createServiceType({ name, description }: CreateServiceTypeDto) {
    const existing = await this.prisma.serviceType.findUnique({
      where: { name },
    });

    if (existing) {
      throw new BadRequestException('Service type already exists');
    }

    return this.prisma.serviceType.create({
      data: {
        name,
        description,
      },
    });
  }

  async createProvider(
    providerData: Omit<CreateProviderDto, 'serviceTypeIds'>,
    registeredById: string,
    serviceTypeIds: string[],
  ) {
    // Verificar que todos los tipos de servicio existen
    const serviceTypes = await this.prisma.serviceType.findMany({
      where: {
        id: {
          in: serviceTypeIds,
        },
      },
    });

    if (serviceTypes.length !== serviceTypeIds.length) {
      throw new BadRequestException('One or more service types do not exist');
    }

    // Verificar que el usuario que registra existe
    const registeredBy = await this.prisma.user.findFirst({
      where: {
        id: registeredById,
      },
    });

    if (!registeredBy) {
      throw new BadRequestException('User not found');
    }

    try {
      // Crear el proveedor con sus relaciones
      // Convertimos el providerData para que coincida con el esquema actual
      const providerCreateData = {
        name: providerData.name,
        businessName: providerData.name || 'Proveedor',
        description: providerData.description,
        email: providerData.email,
        address: providerData.address,
        city: providerData.city,
        state: providerData.state,
        phone: providerData.phone,
        status: ProviderStatus.UNVERIFIED,
        registrationType: 'STANDARD',
        registeredByType: 'USER',
        registeredBy: {
          connect: { id: registeredById },
        }
      };

      const provider = await this.prisma.serviceProvider.create({
        data: {
          ...providerCreateData,
          serviceTypes: {
            create: serviceTypeIds.map(serviceTypeId => ({
              serviceType: {
                connect: { id: serviceTypeId },
              },
            })),
          },
        },
        include: {
          serviceTypes: {
            include: {
              serviceType: true,
            },
          },
          registeredBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          // verifiedBy se ha eliminado porque no existe en el modelo actual
        },
      });

      return provider;
    } catch (error) {
      console.error('Error creating provider:', error);
      throw new BadRequestException('Error creating provider: ' + error.message);
    }
  }

  async getProviders(queryDto: QueryProvidersDto) {
    const { name, city, state, status, serviceTypeIds, skip, take } = queryDto;
    
    // Asegurarnos que serviceTypeIds sea un array
    const serviceTypeIdsArray = Array.isArray(serviceTypeIds) ? serviceTypeIds : serviceTypeIds ? [serviceTypeIds] : [];

    const where: Prisma.ServiceProviderWhereInput = {
      AND: [
        name ? {
          OR: [
            { businessName: { contains: name, mode: 'insensitive' } },
            { description: { contains: name, mode: 'insensitive' } },
          ],
        } : {},
        status ? { status: { equals: status } } : {},
        city ? { city: { equals: city, mode: 'insensitive' } } : {},
        state ? { state: { equals: state, mode: 'insensitive' } } : {},
        serviceTypeIdsArray.length > 0 ? {
          serviceTypes: {
            some: {
              serviceTypeId: {
                in: serviceTypeIdsArray
              }
            }
          }
        } : {},
      ],
    };

    const [total, providers] = await Promise.all([
      this.prisma.serviceProvider.count({ where }),
      this.prisma.serviceProvider.findMany({
        where,
        include: {
          serviceTypes: {
            include: {
              serviceType: true,
            },
          },
          registeredBy: true,
          // verifiedBy no existe en el modelo actual
        },
        skip,
        take,
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    return {
      total,
      providers,
    };
  }

  async verifyProvider(providerId: string, verifiedById: string) {
    const provider = await this.prisma.serviceProvider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new BadRequestException('Provider not found');
    }

    return this.prisma.serviceProvider.update({
      where: { id: providerId },
      data: {
        status: ProviderStatus.VERIFIED,
        // Solo actualizamos el estado ya que el modelo no tiene verifiedById ni verifiedAt
      },
      include: {
        serviceTypes: {
          include: {
            serviceType: true,
          },
        },
        registeredBy: true,
        // verifiedBy ya no existe en el modelo actual
      },
    });
  }

  async addBuildingProvider(buildingSchema: string, dto: AddBuildingProviderDto) {
    const { providerId, isPreferred, notes, contractDetails } = dto;

    // Verificar que el proveedor existe
    const provider = await this.prisma.serviceProvider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    return this.prisma.$queryRawUnsafe(`
      INSERT INTO "${buildingSchema}".building_service_providers 
      (id, provider_id, is_preferred, notes, contract_details, created_at, updated_at)
      VALUES 
      ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *
    `, 
    providerId,
    providerId,
    isPreferred || false,
    notes || null,
    contractDetails || null,
    );
  }

  async getBuildingProviders(buildingSchema: string) {
    return this.prisma.$queryRawUnsafe(`
      SELECT * FROM "${buildingSchema}".building_service_providers
      ORDER BY created_at DESC
    `);
  }

  async updateProvider(
    id: string,
    providerData: Omit<CreateProviderDto, 'serviceTypeIds'>,
    serviceTypeIds: string[],
    userId: string,
  ) {
    // Verificar que el proveedor existe
    const provider = await this.prisma.serviceProvider.findUnique({
      where: { id },
      include: {
        serviceTypes: true,
      },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    // Verificar que todos los tipos de servicio existen
    const serviceTypes = await this.prisma.serviceType.findMany({
      where: {
        id: {
          in: serviceTypeIds,
        },
      },
    });

    if (serviceTypes.length !== serviceTypeIds.length) {
      throw new BadRequestException('One or more service types do not exist');
    }

    try {
      // Actualizar el proveedor y sus relaciones
      const updatedProvider = await this.prisma.serviceProvider.update({
        where: { id },
        data: {
          ...providerData,
          serviceTypes: {
            // Eliminar todas las relaciones existentes
            deleteMany: {},
            // Crear las nuevas relaciones
            create: serviceTypeIds.map(serviceTypeId => ({
              serviceType: {
                connect: { id: serviceTypeId },
              },
            })),
          },
        },
        include: {
          serviceTypes: {
            include: {
              serviceType: true,
            },
          },
          registeredBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          // verifiedBy se ha eliminado porque no existe en el modelo actual
        },
      });

      return updatedProvider;
    } catch (error) {
      console.error('Error updating provider:', error);
      throw new BadRequestException('Error updating provider: ' + error.message);
    }
  }
}
