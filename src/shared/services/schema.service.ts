import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class SchemaService {
  constructor(private prisma: PrismaService) {}

  async createBuildingSchema(buildingId: string, schemaName: string): Promise<void> {
    // Crear el schema
    await this.prisma.$executeRaw`CREATE SCHEMA IF NOT EXISTS ${schemaName}`;

    // Crear las tablas en el nuevo schema
    await this.prisma.$executeRaw`
      CREATE TABLE ${schemaName}.units (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        number TEXT NOT NULL,
        floor TEXT NOT NULL,
        owner_id UUID NOT NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NOT NULL,
        FOREIGN KEY (owner_id) REFERENCES public.users(id)
      );

      CREATE TABLE ${schemaName}.claims (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL,
        unit_id UUID NOT NULL,
        creator_id UUID NOT NULL,
        service_provider_id UUID,
        comments TEXT[],
        images TEXT[],
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NOT NULL,
        FOREIGN KEY (unit_id) REFERENCES ${schemaName}.units(id),
        FOREIGN KEY (creator_id) REFERENCES public.users(id),
        FOREIGN KEY (service_provider_id) REFERENCES public.service_providers(id)
      );
    `;
  }

  async deleteBuildingSchema(schemaName: string): Promise<void> {
    await this.prisma.$executeRaw`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`;
  }

  getSchemaName(buildingId: string): string {
    return `building_${buildingId.replace(/-/g, '_')}`;
  }
}
