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

  async create(buildingId: string, userId: string, createClaimDto: CreateClaimDto) {
    console.log(`[ClaimsService] Iniciando creación de reclamo para edificio: ${buildingId} y usuario: ${userId}`);
    console.log(`[ClaimsService] Datos recibidos:`, JSON.stringify(createClaimDto, null, 2));
    
    // Obtener el esquema del edificio directamente
    const building = await this.prisma.building.findUnique({
      where: { id: buildingId },
      select: { schema: true }
    });

    if (!building) {
      throw new Error(`Building with ID ${buildingId} not found`);
    }

    const { unitId, spaceId, ...claimData } = createClaimDto;

    // Validación de campos obligatorios
    if (!claimData.location) {
      throw new Error('El campo location es obligatorio');
    }

    // Validación de unitId si es tipo UNIT
    if (claimData.location === 'UNIT' && !unitId) {
      throw new Error('Unit ID is required for claims in a unit');
    }

    // Preparar datos para la inserción SQL con escape correcto de comillas
    const title = claimData.title?.replace(/'/g, "''") || 'Sin título';
    const description = claimData.description?.replace(/'/g, "''") || 'Sin descripción';
    const priority = claimData.priority || 'NORMAL';
    const location = claimData.location;
    const locationDetail = claimData.locationDetail?.replace(/'/g, "''") || null;
    const locationDetailSql = locationDetail ? `'${locationDetail}'` : 'NULL';
    const status = 'PENDING';
    
    // Manejo correcto de UUIDs para evitar errores de sintaxis
    const unitIdSql = unitId ? `'${unitId}'` : 'NULL';
    const spaceIdSql = spaceId ? `'${spaceId}'` : 'NULL';
    
    // Log para depuración
    console.log(`[ClaimsService] Preparando SQL con valores:`);  
    console.log(`- title: ${title}`);  
    console.log(`- description: ${description} (truncado)`);  
    console.log(`- location: ${location}`);  
    console.log(`- unitId: ${unitIdSql}`);  
    console.log(`- spaceId: ${spaceIdSql}`);  
    console.log(`- locationDetail: ${locationDetailSql}`);  
    console.log(`- userId: ${userId}`);  

    const result = await this.prisma.$queryRawUnsafe(`
      INSERT INTO "${building.schema}".claims
      (id, title, description, status, location, creator_id, unit_id, space_id, location_detail, priority, created_at, updated_at)
      VALUES
      (gen_random_uuid(), '${title}', '${description}', '${status}', '${location}', '${userId}', ${unitIdSql}, ${spaceIdSql}, ${locationDetailSql}, '${priority}', NOW(), NOW())
      RETURNING 
        id, title, description, status,
        unit_id as "unitId", space_id as "spaceId", 
        creator_id as "creatorId", created_at as "createdAt",
        updated_at as "updatedAt"
    `) as any[];

    if (!result || result.length === 0) {
      throw new Error('No se pudo crear el reclamo');
    }

    const newClaim = result[0];

    // Obtener datos adicionales de unidad y espacio si aplica
    if (unitId) {
      const unitResult = await this.prisma.$queryRawUnsafe(`
        SELECT number as "unitNumber" FROM "${building.schema}".units WHERE id = '${unitId}'
      `) as RawUnit[];
      if (unitResult && unitResult.length > 0) {
        newClaim.unit = unitResult[0];
      }
    }

    if (spaceId) {
      const spaceResult = await this.prisma.$queryRawUnsafe(`
        SELECT id, name FROM "${building.schema}".spaces WHERE id = '${spaceId}'
      `) as RawSpace[];
      if (spaceResult && spaceResult.length > 0) {
        newClaim.space = spaceResult[0];
      }
    }

    return newClaim;
  }

  async findAll(buildingId: string, userId: string, userRole: string, onlyOwnClaims: boolean = false) {
    console.log(`[ClaimsService] Buscando reclamos para edificio: ${buildingId}, usuario: ${userId}, rol: ${userRole}, onlyOwnClaims: ${onlyOwnClaims}`);
    
    try {
      // Obtener el esquema del edificio directamente
      const building = await this.prisma.building.findUnique({
        where: { id: buildingId },
        select: { schema: true }
      });

      if (!building) {
        throw new Error(`Building with ID ${buildingId} not found`);
      }
      
      // Construir la base de la consulta SQL que es común para todos los roles
      let query = `
        SELECT 
          c.id, c.title, c.description, c.status, c.location,
          c.location_detail as "locationDetail",
          c.priority, 
          c.unit_id as "unitId", c.space_id as "spaceId", 
          c.creator_id as "creatorId", c.created_at as "createdAt",
          c.updated_at as "updatedAt",
          u.number as "unitNumber", u.floor as "unitFloor",
          s.id as "spaceId", s.name as "spaceName",
          st.id as "spaceTypeId", st.name as "spaceTypeName"
        FROM "${building.schema}".claims c
        LEFT JOIN "${building.schema}".units u ON c.unit_id = u.id
        LEFT JOIN "${building.schema}".spaces s ON c.space_id = s.id
        LEFT JOIN "${building.schema}".space_types st ON s.space_type_id = st.id
      `;
      
      // Si debe filtrar por propietario (ya sea OWNER o explícitamente solicitado con onlyOwnClaims)
      if (onlyOwnClaims) {
        query += ` WHERE c.creator_id = '${userId}'`;
      }
      
      // Ordenar por fecha de creación (más recientes primero)
      query += ` ORDER BY c.created_at DESC`;
      
      console.log(`[ClaimsService] Ejecutando consulta SQL: ${query}`);
      
      // Ejecutar la consulta
      const claims = await this.prisma.$queryRawUnsafe(query) as any[];
      console.log(`[ClaimsService] Reclamos encontrados: ${claims.length}`);
      
      // Estructurar adecuadamente los objetos space y unit para todos los roles
      claims.forEach(claim => {
        // Estructurar datos del espacio
        if (claim.spaceId && claim.spaceName) {
          claim.space = {
            id: claim.spaceId,
            name: claim.spaceName,
            spaceType: claim.spaceTypeId && claim.spaceTypeName ? {
              id: claim.spaceTypeId,
              name: claim.spaceTypeName
            } : null
          };
          // Eliminar campos redundantes
          delete claim.spaceName;
          delete claim.spaceTypeId;
          delete claim.spaceTypeName;
        }
        
        // Estructurar datos de la unidad
        if (claim.unitId && (claim.unitNumber || claim.unitFloor)) {
          claim.unit = {
            id: claim.unitId,
            number: claim.unitNumber,
            floor: claim.unitFloor
          };
          // Eliminar campos redundantes
          delete claim.unitNumber;
          delete claim.unitFloor;
        }
      });
      
      // Solo para administradores, enriquecer con información de los creadores
      // Los propietarios viendo sus propios reclamos no necesitan esta info
      const needsCreatorInfo = (userRole === 'BUILDING_ADMIN' || userRole === 'SUPER_ADMIN');
      
      if (needsCreatorInfo && claims.length > 0) {
        // Obtener IDs únicos de creadores
        const creatorIds = [...new Set(claims.map(claim => claim.creatorId))].filter((id): id is string => !!id);
        
        if (creatorIds.length > 0) {
          console.log(`[ClaimsService] Obteniendo información de ${creatorIds.length} creadores`);
          
          try {
            // Consultar información de los creadores
            const creators = await this.prisma.user.findMany({
              where: { id: { in: creatorIds } },
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true
              }
            });
            
            // Crear mapa de acceso rápido por ID
            const creatorsMap = new Map<string, any>(creators.map(creator => [creator.id, creator]));
            
            // Añadir la información del creador a cada reclamo
            claims.forEach((claim: any) => {
              if (claim.creatorId && creatorsMap.has(claim.creatorId)) {
                claim.creator = creatorsMap.get(claim.creatorId);
              }
            });
          } catch (error) {
            // Si falla la obtención de creadores, logueamos pero no interrumpimos el flujo principal
            console.error(`[ClaimsService] Error al obtener información de creadores: ${error.message}`);
          }
        }
      }
      
      return claims;
    } catch (error) {
      console.error(`[ClaimsService] Error al obtener los reclamos: ${error.message}`);
      throw error;
    }
  }

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

  async addComment(buildingId: string, claimId: string, userId: string, content: string) {
    // Obtener el esquema del edificio directamente
    const building = await this.prisma.building.findUnique({
      where: { id: buildingId },
      select: { schema: true }
    });

    if (!building) {
      throw new Error(`Building with ID ${buildingId} not found`);
    }

    const escapedContent = content.replace(/'/g, "''");

    const result = await this.prisma.$queryRawUnsafe(`
      INSERT INTO "${building.schema}".claim_comments 
      (id, content, claim_id, user_id, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        '${escapedContent}',
        '${claimId}',
        '${userId}',
        NOW(),
        NOW()
      )
      RETURNING 
        id, content, claim_id as "claimId", user_id as "userId",
        created_at as "createdAt", updated_at as "updatedAt";
    `);

    return result;
  }

  async remove(buildingId: string, id: string, userId: string, userRole: string) {
    console.log(`[ClaimsService] Eliminando reclamo: ${id} en edificio: ${buildingId} por usuario: ${userId} con rol: ${userRole}`);
    
    try {
      // Obtener el esquema del edificio
      const building = await this.prisma.building.findUnique({
        where: { id: buildingId },
        select: { schema: true }
      });

      if (!building) {
        throw new Error(`Building with ID ${buildingId} not found`);
      }

      // Verificar si el reclamo existe y si el usuario es el creador o un administrador
      const claims = await this.prisma.$queryRawUnsafe(`
        SELECT c.id, c.creator_id as "creatorId", c.title
        FROM "${building.schema}".claims c
        WHERE c.id = '${id}'
      `) as any[];

      if (!claims || claims.length === 0) {
        throw new NotFoundException(`Claim with ID ${id} not found`);
      }

      const claim = claims[0];
      console.log(`[ClaimsService] Reclamo encontrado: ${claim.title}, creadorId: ${claim.creatorId}, usuarioSolicitante: ${userId}`);
      
      // Verificar si el usuario tiene permiso para eliminar el reclamo
      const isCreator = claim.creatorId === userId;
      const isAdmin = userRole === 'BUILDING_ADMIN' || userRole === 'SUPER_ADMIN';
      console.log(`[ClaimsService] ¿Es creador?: ${isCreator}, ¿Es admin?: ${isAdmin}`);
      
      // Solo el creador o un administrador pueden eliminar
      if (!isCreator && !isAdmin) {
        throw new Error(`No tienes permiso para eliminar este reclamo. Tu ID: ${userId}, ID del creador: ${claim.creatorId}, tu rol: ${userRole}`);
      }

      // Eliminar primero los comentarios asociados al reclamo
      await this.prisma.$queryRawUnsafe(`
        DELETE FROM "${building.schema}".claim_comments
        WHERE claim_id = '${id}'
      `);

      console.log(`[ClaimsService] Comentarios eliminados correctamente para reclamo: ${id}`);

      // Luego eliminar el reclamo
      await this.prisma.$queryRawUnsafe(`
        DELETE FROM "${building.schema}".claims
        WHERE id = '${id}'
      `);

      console.log(`[ClaimsService] Reclamo eliminado correctamente: ${id}`);
      return { id, message: 'Reclamo eliminado correctamente' };
    } catch (error) {
      console.error(`[ClaimsService] Error al eliminar reclamo: ${error.message}`);
      throw error;
    }
  }
}
