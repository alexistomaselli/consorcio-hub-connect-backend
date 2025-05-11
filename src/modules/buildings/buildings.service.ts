import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class BuildingsService {
  constructor(private prisma: PrismaService) {}

  async create(createBuildingDto: CreateBuildingDto, adminId: string) {
    // 1. Verificar que el usuario exista
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId }
    });

    if (!admin) {
      throw new Error('Administrador no encontrado');
    }

    // 2. Obtener el plan gratuito por defecto
    const freePlan = await this.prisma.plan.findUnique({
      where: { type: 'FREE' }
    });

    if (!freePlan) {
      throw new Error('Plan gratuito no encontrado');
    }

    // 3. Crear el registro del edificio
    const building = await this.prisma.building.create({
      data: {
        ...createBuildingDto,
        adminId,
        planId: freePlan.id,
        schema: `building_${uuidv4().replace(/-/g, '_')}`, // Generar nombre único para el schema
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 días de prueba
      },
      include: {
        admin: true,
        plan: true
      }
    });

    // Crear las tablas en el nuevo schema
    await this.createBuildingTables(building.schema);

    return building;
  }

  async createBuildingTables(schema: string) {
    // Crear el schema
    await this.prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);    

    // Crear extensión uuid-ossp si no existe
    await this.prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

    // Crear tabla units
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${schema}".units (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        number VARCHAR(255) NOT NULL,
        floor VARCHAR(255) NOT NULL,
        owner_id UUID NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Crear tabla claims
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${schema}".claims (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        status VARCHAR(50) NOT NULL,
        unit_id UUID NOT NULL REFERENCES "${schema}".units(id),
        creator_id UUID NOT NULL,
        service_provider_id UUID,
        comments TEXT[] DEFAULT ARRAY[]::TEXT[],
        images TEXT[] DEFAULT ARRAY[]::TEXT[],
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Crear índices
    await this.prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_units_owner_id ON "${schema}".units(owner_id)
    `);
    await this.prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_claims_unit_id ON "${schema}".claims(unit_id)
    `);
    await this.prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_claims_creator_id ON "${schema}".claims(creator_id)
    `);
  }

  async findAll() {
    return this.prisma.building.findMany();
  }

  async findOne(id: string) {
    console.log('=== Buscando edificio y su instancia de WhatsApp ===');
    console.log('Building ID:', id);

    try {
      const building = await this.prisma.building.findUnique({
        where: { id },
        include: {
          whatsappInstance: true,
          admin: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          },
          plan: true
        }
      });

      console.log('Building encontrado:', building);
      return building;
    } catch (error) {
      console.error('Error al buscar el edificio:', error);
      throw error;
    }
  }

  async findByAdmin(adminId: string) {
    console.log('=== Buscando edificios por admin ID ===');
    console.log('Admin ID:', adminId);

    try {
      const buildings = await this.prisma.building.findMany({
        where: { adminId },
        include: {
          whatsappInstance: true,
          admin: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          },
          plan: true
        }
      });

      console.log(`Encontrados ${buildings.length} edificios`);
      return buildings;
    } catch (error) {
      console.error('Error al buscar edificios:', error);
      throw error;
    }
  }

  async update(id: string, updateBuildingDto: UpdateBuildingDto) {
    return this.prisma.building.update({
      where: { id },
      data: updateBuildingDto,
      include: {
        admin: true,
        plan: true
      }
    });
  }
}
