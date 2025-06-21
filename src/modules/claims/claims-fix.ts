import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClaimDto } from './dto/create-claim.dto';
import { UpdateClaimDto } from './dto/update-claim.dto';

// Define interfaces for raw query results
export interface RawClaim {
  id: string;
  title: string;
  description: string;
  status: string;
  unitId?: string;
  spaceId?: string;
  creatorId?: string;
  createdAt: Date;
  updatedAt?: Date;
  [key: string]: any; // Allow additional properties
}

interface RawUnit {
  unitNumber: string;
  [key: string]: any;
}

interface RawSpace {
  id: string;
  name: string;
  [key: string]: any;
}

export interface RawUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  [key: string]: any;
}

@Injectable()
export class ClaimsService {
  constructor(private prisma: PrismaService) {}

  async findById(buildingId: string, id: string) {
    // Obtener el esquema del edificio directamente
    const building = await this.prisma.building.findUnique({
      where: { id: buildingId },
      select: { schema: true }
    });
    
    if (!building) {
      throw new Error(`Building with ID ${buildingId} not found`);
    }
    
    const claims = await this.prisma.$queryRawUnsafe(`
      SELECT 
        c.id, c.title, c.description, c.status, c.location,
        c.location_detail as "locationDetail",
        c.unit_id as "unitId", c.space_id as "spaceId", 
        c.creator_id as "creatorId", c.created_at as "createdAt",
        c.updated_at as "updatedAt"
      FROM "${building.schema}".claims c
      LEFT JOIN "${building.schema}".units u ON c.unit_id = u.id
      LEFT JOIN "${building.schema}".spaces s ON c.space_id = s.id
      WHERE c.id = '${id}'
    `) as any[];

    if (!claims || claims.length === 0) {
      throw new NotFoundException(`Claim with ID ${id} not found`);
    }

    // Añadir información del creador
    const claim = claims[0];
    if (claim.creatorId) {
      try {
        const creator = await this.prisma.user.findUnique({
          where: { id: claim.creatorId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        });
        
        if (creator) {
          claim.creator = creator;
        }
      } catch (error) {
        console.error(`[ClaimsService] Error al obtener información del creador: ${error}`);
      }
    }

    return claim;
  }

  async update(buildingId: string, id: string, updateClaimDto: UpdateClaimDto) {
    // Obtener el esquema del edificio directamente
    const building = await this.prisma.building.findUnique({
      where: { id: buildingId },
      select: { schema: true }
    });

    if (!building) {
      throw new Error(`Building with ID ${buildingId} not found`);
    }

    // Construir la actualización SQL dinámicamente
    let updateValues: string[] = [];
    
    if (updateClaimDto.title !== undefined) {
      const title = updateClaimDto.title.replace(/'/g, "''");
      updateValues.push(`title = '${title}'`);
    }
    
    if (updateClaimDto.description !== undefined) {
      const description = updateClaimDto.description.replace(/'/g, "''");
      updateValues.push(`description = '${description}'`);
    }
    
    if (updateClaimDto.status !== undefined) {
      updateValues.push(`status = '${updateClaimDto.status}'`);
    }
    
    if (updateClaimDto.serviceProviderId !== undefined) {
      const serviceProviderIdSql = updateClaimDto.serviceProviderId ? 
        `'${updateClaimDto.serviceProviderId}'` : 'NULL';
      updateValues.push(`service_provider_id = ${serviceProviderIdSql}`);
    }
    
    updateValues.push(`updated_at = NOW()`);

    const updateSql = updateValues.join(', ');

    const result = await this.prisma.$queryRawUnsafe(`
      UPDATE "${building.schema}".claims
      SET ${updateSql}
      WHERE id = '${id}'
      RETURNING 
        id, title, description, status,
        unit_id as "unitId", space_id as "spaceId", 
        creator_id as "creatorId", created_at as "createdAt",
        updated_at as "updatedAt"
    `) as any[];

    if (!result || result.length === 0) {
      throw new NotFoundException(`Claim with ID ${id} not found`);
    }

    const updatedClaim = result[0];

    // Obtener datos de unidad si aplica
    if (updatedClaim.unitId) {
      const unitResult = await this.prisma.$queryRawUnsafe(`
        SELECT number as "unitNumber" FROM "${building.schema}".units WHERE id = '${updatedClaim.unitId}'
      `) as any[];
      if (unitResult && unitResult.length > 0) {
        updatedClaim.unit = unitResult[0];
      }
    }

    return updatedClaim;
  }
}
