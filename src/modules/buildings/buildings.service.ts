import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';
import { N8nWebhookService } from '../n8n/n8n-webhook.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class BuildingsService {
  private readonly VERIFICATION_CODE_LENGTH = 6;
  private readonly VERIFICATION_CODE_EXPIRY_MINUTES = 30;

  constructor(
    private prisma: PrismaService,
    private n8nWebhookService: N8nWebhookService
  ) {}

  private generateVerificationCode(): string {
    return Math.random()
      .toString()
      .slice(2, 2 + this.VERIFICATION_CODE_LENGTH);
  }

  async create(createBuildingDto: CreateBuildingDto, adminId: string) {
    // 1. Verificar que el usuario exista
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      include: {
        emailVerifications: true
      }
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

    // Generar código de verificación
    const verificationCode = this.generateVerificationCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.VERIFICATION_CODE_EXPIRY_MINUTES);

    try {
      // 3. Crear el building y la verificación de email en una transacción
      const result = await this.prisma.$transaction(async (prisma) => {
        // Crear el building
        const building = await prisma.building.create({
          data: {
            ...createBuildingDto,
            adminId,
            planId: freePlan.id,
            schema: `building_${uuidv4().replace(/-/g, '_')}`,
            trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          },
          include: {
            admin: true,
            plan: true
          }
        });

        // Crear las tablas en el nuevo schema
        if (!building.schema) {
          throw new Error('Error: schema no generado');
        }
        await this.createBuildingTables(building.schema);

        // Verificar que el admin tenga email
        if (!admin.email) {
          throw new Error('El administrador no tiene email');
        }

        // Crear o actualizar la verificación de email
        const emailVerification = await prisma.emailVerification.create({
          data: {
            email: admin.email,
            verificationCode,
            expiresAt,
            isVerified: false,
            user: {
              connect: {
                id: admin.id
              }
            }
          }
        });

        return { building, emailVerification };
      });

      // 4. Enviar el email de verificación (fuera de la transacción)
      try {
        const webhook = await this.n8nWebhookService.getWebhook('send-verification-email');
        const htmlMessage = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Verificación de Email - ConsorcioHub</h2>
            <p>Hola ${admin.firstName},</p>
            <p>Tu código de verificación es: <strong>${verificationCode}</strong></p>
            <p>Este código expirará en ${this.VERIFICATION_CODE_EXPIRY_MINUTES} minutos.</p>
          </div>
        `;

        await fetch(webhook.prodUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userEmail: admin.email,
            subject: 'Verificación de Email - ConsorcioHub',
            message: htmlMessage
          })
        });
      } catch (emailError) {
        // Log el error pero no afecta la creación del building
        console.error('Error al enviar email de verificación:', emailError);
      }

      return result.building;
    } catch (error) {
      console.error('Error en la transacción:', error);
      throw new Error('Error al crear el edificio');
    }
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
