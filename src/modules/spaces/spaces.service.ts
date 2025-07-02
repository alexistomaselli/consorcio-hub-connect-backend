import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSpaceTypeDto } from './dto/create-space-type.dto';
import { CreateSpaceDto } from './dto/create-space.dto';
import { AssignOwnerDto } from './dto/assign-owner.dto';
import { GenerateUnitsDto, NomenclatureType } from './dto/generate-units.dto';

@Injectable()
export class SpacesService {
  constructor(private prisma: PrismaService) {}

  // -------------------- Space Types --------------------

  async createSpaceType(buildingId: string, createSpaceTypeDto: CreateSpaceTypeDto) {
    try {
      console.log(`[SpacesService] Creando tipo de espacio en building ${buildingId}:`, createSpaceTypeDto);
      
      // Obtenemos directamente el schema del building
      const building = await this.prisma.building.findUnique({
        where: { id: buildingId },
        select: { schema: true }
      });
      
      if (!building) {
        throw new Error(`Building con ID ${buildingId} no encontrado`);
      }
      
      console.log(`[SpacesService] Schema del building: ${building.schema}`);
      
      // Convertir los valores booleanos a texto para PostgreSQL
      const isReservable = createSpaceTypeDto.isReservable ? 'true' : 'false';
      const isAssignable = createSpaceTypeDto.isAssignable ? 'true' : 'false';
      
      // Escape de comillas simples en textos
      const name = createSpaceTypeDto.name.replace(/'/g, "''");
      const description = createSpaceTypeDto.description ? 
                         createSpaceTypeDto.description.replace(/'/g, "''") : 
                         '';
      
      // Crear el tipo de espacio con SQL directo
      const result = await this.prisma.$queryRawUnsafe(`
        INSERT INTO "${building.schema}".space_types 
        (id, name, description, is_reservable, is_assignable) 
        VALUES 
        (gen_random_uuid(), '${name}', '${description}', ${isReservable}, ${isAssignable}) 
        RETURNING id, name, description, is_reservable as "isReservable", is_assignable as "isAssignable", created_at as "createdAt", updated_at as "updatedAt";
      `) as any[];
      
      console.log(`[SpacesService] Resultado de la inserción del tipo de espacio:`, result);
      
      if (!result || !result.length) {
        throw new Error('No se pudo crear el tipo de espacio');
      }
      
      const newSpaceType = result[0];
      console.log(`[SpacesService] Tipo de espacio creado exitosamente:`, newSpaceType);
      return newSpaceType;
    } catch (error) {
      console.error(`[SpacesService] Error al crear tipo de espacio:`, error);
      // Reenviar el error para que sea manejado por el controlador
      throw error;
    }
  }

  async findAllSpaceTypes(buildingId: string) {
    try {
      // Obtener el schema del building
      const building = await this.prisma.building.findUnique({
        where: { id: buildingId },
        select: { schema: true }
      });
      
      if (!building) {
        throw new Error(`Building con ID ${buildingId} no encontrado`);
      }
      
      console.log(`[SpacesService] Consultando tipos de espacios en schema: ${building.schema}`);
      
      // Verificar si existe la tabla de space_types
      const tableExists = await this.prisma.$queryRawUnsafe(`
        SELECT EXISTS (
          SELECT FROM pg_tables
          WHERE schemaname = '${building.schema}'
          AND tablename = 'space_types'
        ) as "exists";
      `) as [{exists: boolean}];
      
      if (!tableExists[0].exists) {
        console.log(`[SpacesService] La tabla space_types no existe en el schema ${building.schema}`);
        throw new Error(`La tabla space_types no existe en el schema ${building.schema}`);
      }
      
      // Usar consulta SQL directa para obtener los tipos de espacios con conteo
      // Primera consulta para obtener los tipos
      const spaceTypes = await this.prisma.$queryRawUnsafe(`
        SELECT 
          st.id, 
          st.name, 
          st.description,
          st.is_reservable as "isReservable",
          st.is_assignable as "isAssignable",
          st.created_at as "createdAt",
          st.updated_at as "updatedAt"
        FROM "${building.schema}".space_types st
        ORDER BY st.name ASC;
      `) as any[];
      
      // Segunda consulta para obtener el conteo de espacios por tipo
      const spaceCountByType = await this.prisma.$queryRawUnsafe(`
        SELECT 
          space_type_id as "spaceTypeId",
          COUNT(*) as "count"
        FROM "${building.schema}".spaces
        GROUP BY space_type_id;
      `) as {spaceTypeId: string, count: number}[];
      
      // Combinar los resultados
      const formattedTypes = spaceTypes.map(type => {
        // Buscar el conteo de espacios para este tipo
        const countRecord = spaceCountByType.find(count => count.spaceTypeId === type.id);
        
        // Convertir el BigInt a Number si existe
        const spacesCount = countRecord ? Number(countRecord.count) : 0;
        
        return {
          ...type,
          _count: {
            spaces: spacesCount
          }
        };
      });
      
      console.log(`[SpacesService] Encontrados ${formattedTypes.length} tipos de espacios`);
      return formattedTypes;
    } catch (error) {
      console.error(`[SpacesService] Error al buscar tipos de espacios:`, error);
      
      // Propagar todos los errores
      throw error;
    }
  }

  async findSpaceType(buildingId: string, id: string) {
    const buildingClient = await this.prisma.getBuildingClient(buildingId);
    
    if (!buildingClient) {
      throw new Error(`Could not get client for building: ${buildingId}`);
    }
    
    // Usando consulta SQL directa en lugar de buildingClient.spaceType que no existe
    const building = await this.prisma.building.findUnique({
      where: { id: buildingId },
      select: { schema: true }
    });
    
    if (!building) {
      throw new Error(`Building con ID ${buildingId} no encontrado`);
    }
    
    const results = await buildingClient.$queryRawUnsafe(`
      SELECT st.*, 
        (SELECT json_agg(s) FROM "${building.schema}".spaces s WHERE s.space_type_id = st.id) as spaces
      FROM "${building.schema}".space_types st 
      WHERE st.id = '${id}'
      LIMIT 1;
    `) as any[];
    
    return results[0] || null;
  }

  async updateSpaceType(buildingId: string, id: string, updateSpaceTypeDto: CreateSpaceTypeDto) {
    try {
      console.log(`[SpacesService] Actualizando tipo de espacio en building ${buildingId}, ID: ${id}:`, updateSpaceTypeDto);
      
      // Obtenemos directamente el schema del building
      const building = await this.prisma.building.findUnique({
        where: { id: buildingId },
        select: { schema: true }
      });
      
      if (!building) {
        throw new Error(`Building con ID ${buildingId} no encontrado`);
      }
      
      console.log(`[SpacesService] Schema del building: ${building.schema}`);
      
      // Convertir los valores booleanos a texto para PostgreSQL
      const isReservable = updateSpaceTypeDto.isReservable ? 'true' : 'false';
      const isAssignable = updateSpaceTypeDto.isAssignable ? 'true' : 'false';
      
      // Escape de comillas simples en textos
      const name = updateSpaceTypeDto.name.replace(/'/g, "''");
      const description = updateSpaceTypeDto.description ? 
                         updateSpaceTypeDto.description.replace(/'/g, "''") : 
                         '';
      
      // Actualizar el tipo de espacio con SQL directo
      const result = await this.prisma.$queryRawUnsafe(`
        UPDATE "${building.schema}".space_types 
        SET 
          name = '${name}', 
          description = '${description}', 
          is_reservable = ${isReservable}, 
          is_assignable = ${isAssignable},
          updated_at = NOW()
        WHERE id = '${id}'
        RETURNING id, name, description, is_reservable as "isReservable", is_assignable as "isAssignable", created_at as "createdAt", updated_at as "updatedAt";
      `) as any[];
      
      console.log(`[SpacesService] Resultado de la actualización del tipo de espacio:`, result);
      
      if (!result || !result.length) {
        throw new Error(`No se pudo actualizar el tipo de espacio con ID ${id}`);
      }
      
      const updatedSpaceType = result[0];
      console.log(`[SpacesService] Tipo de espacio actualizado exitosamente:`, updatedSpaceType);
      return updatedSpaceType;
    } catch (error) {
      console.error(`[SpacesService] Error al actualizar tipo de espacio:`, error);
      // Reenviar el error para que sea manejado por el controlador
      throw error;
    }
  }

  async removeSpaceType(buildingId: string, id: string) {
    try {
      console.log(`[SpacesService] Eliminando tipo de espacio en building ${buildingId}, ID: ${id}`);
      
      // Obtenemos directamente el schema del building
      const building = await this.prisma.building.findUnique({
        where: { id: buildingId },
        select: { schema: true }
      });
      
      if (!building) {
        throw new Error(`Building con ID ${buildingId} no encontrado`);
      }
      
      console.log(`[SpacesService] Schema del building: ${building.schema}`);
      
      // Verificar si el tipo de espacio tiene espacios asociados usando SQL directo
      const spaceCountResult = await this.prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as count 
        FROM "${building.schema}".spaces 
        WHERE space_type_id = '${id}';
      `) as [{count: number | BigInt}];
      
      const spaceCount = Number(spaceCountResult[0].count);
      
      if (spaceCount > 0) {
        throw new Error('No se puede eliminar un tipo de espacio que tiene espacios asociados');
      }
      
      // Eliminar el tipo de espacio con SQL directo
      const result = await this.prisma.$queryRawUnsafe(`
        DELETE FROM "${building.schema}".space_types 
        WHERE id = '${id}'
        RETURNING id;
      `) as any[];
      
      console.log(`[SpacesService] Resultado de la eliminación del tipo de espacio:`, result);
      
      if (!result || !result.length) {
        throw new Error(`No se pudo eliminar el tipo de espacio con ID ${id}`);
      }
      
      console.log(`[SpacesService] Tipo de espacio eliminado exitosamente: ${id}`);
      return { id: result[0].id };
    } catch (error) {
      console.error(`[SpacesService] Error al eliminar tipo de espacio:`, error);
      // Reenviar el error para que sea manejado por el controlador
      throw error;
    }
  }

  // -------------------- Spaces --------------------

  async createSpace(buildingId: string, createSpaceDto: CreateSpaceDto) {
    try {
      console.log(`[SpacesService] Creando espacio en building ${buildingId}:`, createSpaceDto);
      
      // Asegurarnos de que el building existe
      const building = await this.prisma.building.findUnique({
        where: { id: buildingId },
        select: { schema: true }
      });
      
      if (!building) {
        throw new Error(`Building con ID ${buildingId} no encontrado`);
      }
      
      // Verificamos que el tipo de espacio existe
      try {
        const spaceTypeExists = await this.prisma.$queryRawUnsafe(`
          SELECT EXISTS (
            SELECT FROM "${building.schema}".space_types 
            WHERE id = '${createSpaceDto.spaceTypeId}'::uuid
          ) as "exists";
        `) as any[];
        
        console.log(`[SpacesService] ¿Existe el tipo de espacio?:`, spaceTypeExists);
        
        const exists = spaceTypeExists[0] && 
                      (spaceTypeExists[0].exists === true || 
                       spaceTypeExists[0].exists === 't' || 
                       spaceTypeExists[0].exists === 'true');
        
        if (!exists) {
          throw new Error(`El tipo de espacio con ID ${createSpaceDto.spaceTypeId} no existe`);
        }
      } catch (typeCheckError) {
        console.error(`[SpacesService] Error al verificar el tipo de espacio:`, typeCheckError);
        throw new Error(`Error al verificar el tipo de espacio: ${typeCheckError.message}`);
      }
      
      // Intentamos crear el espacio directamente con SQL para tener mejor control
      try {
        const result = await this.prisma.$queryRawUnsafe(`
          INSERT INTO "${building.schema}".spaces 
          (id, name, space_type_id, floor, description) 
          VALUES 
          (gen_random_uuid(), '${createSpaceDto.name.replace(/'/g, "''")}', '${createSpaceDto.spaceTypeId}'::uuid, '${createSpaceDto.floor || ''}'::varchar, '${createSpaceDto.description || ''}'::varchar) 
          RETURNING id, name, floor, description, space_type_id as "spaceTypeId", created_at as "createdAt", updated_at as "updatedAt";
        `) as any[];
        
        console.log(`[SpacesService] Resultado de la inserción:`, result);
        
        if (!result || !result.length) {
          throw new Error('No se pudo crear el espacio');
        }
        
        // Obtener los datos completos del espacio incluyendo su tipo
        return this.findSpace(buildingId, result[0].id);
      } catch (insertError) {
        console.error(`[SpacesService] Error al insertar espacio:`, insertError);
        throw new Error(`Error al insertar espacio: ${insertError.message}`);
      }
    } catch (error) {
      console.error(`[SpacesService] Error general al crear espacio:`, error);
      throw error;
    }
  }

  async findAllSpacesSimplified(buildingId: string) {
    try {
      console.log(`[SpacesService] BASIC: Iniciando obtención de espacios para building: ${buildingId}`);

      // 1. Obtener el schema del edificio
      const building = await this.prisma.building.findUnique({
        where: { id: buildingId },
        select: { schema: true }
      });
      
      if (!building) {
        console.error(`[SpacesService] BASIC: Building con ID ${buildingId} no encontrado`);
        return [];
      }
      
      console.log(`[SpacesService] BASIC: Consultando espacios en schema: ${building.schema}`);
      
      // 2. Obtener todos los espacios con sus tipos - CONSULTA SIMPLIFICADA
      const spacesQuery = `
        SELECT 
          s.id, 
          s.name, 
          s.floor, 
          s.description,
          s.space_type_id as "spaceTypeId",
          st.id as "typeId",
          st.name as "typeName",
          st.description as "typeDescription",
          st.is_reservable as "typeIsReservable",
          st.is_assignable as "typeIsAssignable"
        FROM "${building.schema}".spaces s
        LEFT JOIN "${building.schema}".space_types st ON s.space_type_id = st.id
      `;
      
      // 3. Ejecutar consulta de espacios con manejo de errores directo
      try {
        const spaces = await this.prisma.$queryRawUnsafe(spacesQuery) as any[];
        const spacesCount = spaces?.length || 0;
        
        console.log(`[SpacesService] BASIC: Encontrados ${spacesCount} espacios`);
        
        if (spacesCount === 0) {
          console.log('[SpacesService] BASIC: No se encontraron espacios para este edificio');
          return [];
        }
        
        // Detalles del primer espacio para diagnóstico
        if (spaces.length > 0) {
          console.log('[SpacesService] BASIC: Ejemplo del primer espacio encontrado:', 
            JSON.stringify(spaces[0]));
        }
        
        // 4. Formatear los espacios (sin propietarios por ahora)
        const spacesWithTypes = spaces.map(space => ({
          id: space.id,
          name: space.name,
          floor: space.floor || '',
          description: space.description || '',
          spaceTypeId: space.spaceTypeId,
          type: {
            id: space.typeId,
            name: space.typeName,
            description: space.typeDescription || '',
            isReservable: !!space.typeIsReservable,
            isAssignable: !!space.typeIsAssignable
          },
          // Por ahora, array vacío de propietarios
          owners: [],
          claims: []
        }));
        
        console.log(`[SpacesService] BASIC: Formateados ${spacesWithTypes.length} espacios correctamente`);
        
        // FASE 2: OBTENER PROPIETARIOS CON MANEJO ROBUSTO DE ERRORES
        try {
          // Sólo proceder si hay espacios
          if (spaces.length > 0) {
            // Obtener IDs de espacios para la consulta
            const spaceIds = spaces.map(s => s.id);
            
            if (spaceIds.length === 0) {
              console.log('[SpacesService] BASIC: No hay IDs de espacios para consultar propietarios');
              return spacesWithTypes;
            }
            
            // Convertir los UUIDs a texto y asegurar formato para consulta SQL
            const spaceIdsStr = spaceIds.map(id => `'${id}'`).join(',');
            console.log(`[SpacesService] BASIC: Consultando propietarios para ${spaceIds.length} espacios`);
            
            // Consulta mejorada con conversiones de tipos explícitas y nombres de columnas en camelCase
            const ownersQuery = `
              SELECT 
                so.id as "id",
                so.space_id::text as "spaceId",
                so.owner_id::text as "ownerId", 
                so.is_main as "isMain",
                u.id::text as "userId", 
                u."firstName" as "firstName",
                u."lastName" as "lastName",
                u.email
              FROM "${building.schema}".space_owners so
              JOIN public.users u ON so.owner_id::uuid = u.id::uuid
              WHERE so.space_id::uuid IN (${spaceIdsStr})
            `;
            
            console.log(`[SpacesService] BASIC: Ejecutando consulta de propietarios...`);
            
            const owners = await this.prisma.$queryRawUnsafe(ownersQuery) as any[];
            console.log(`[SpacesService] BASIC: Encontrados ${owners.length} propietarios en total`);
            
            // Si se encontraron propietarios, procesarlos
            if (owners && owners.length > 0) {
              // Diagnóstico: Mostrar el primer propietario para verificar estructura
              console.log('[SpacesService] BASIC: Ejemplo del primer propietario:', JSON.stringify(owners[0]));
              
              // Crear mapa de propietarios por spaceId para eficiencia
              const ownersBySpaceId = {};
              
              owners.forEach(owner => {
                // Validar que el propietario tenga un spaceId válido
                if (!owner.spaceId) {
                  console.warn('[SpacesService] BASIC: Propietario sin spaceId válido:', owner);
                  return;
                }
                
                const spaceId = owner.spaceId;
                
                if (!ownersBySpaceId[spaceId]) {
                  ownersBySpaceId[spaceId] = [];
                }
                
                // Formatear el propietario según la estructura esperada por el frontend
                ownersBySpaceId[spaceId].push({
                  id: owner.ownerId,           // ID de usuario (UUID)
                  userId: owner.userId,        // Conservamos por si es necesario
                  firstName: owner.firstName || '',
                  lastName: owner.lastName || '',
                  isMain: !!owner.isMain,      // Aseguramos que sea booleano
                  email: owner.email || ''
                });
              });
              
              // Asignar propietarios a cada espacio o array vacío si no tiene
              spacesWithTypes.forEach(space => {
                if (space && space.id) {
                  space.owners = ownersBySpaceId[space.id] || [];
                }
              });
              
              // Diagnóstico: Contar espacios que tienen propietarios asignados
              const spacesWithOwners = spacesWithTypes.filter(s => s.owners && s.owners.length > 0);
              console.log(`[SpacesService] BASIC: ${spacesWithOwners.length} de ${spacesWithTypes.length} espacios tienen propietarios asignados`);
              
              // Mostrar ejemplo de espacio con propietarios
              if (spacesWithOwners.length > 0) {
                console.log('[SpacesService] BASIC: Ejemplo de espacio con propietarios:',
                  JSON.stringify({
                    id: spacesWithOwners[0].id,
                    name: spacesWithOwners[0].name, 
                    owners: spacesWithOwners[0].owners
                  }));
              }
            }
          }
          
          return spacesWithTypes;
        } catch (ownerError) {
          // Error al obtener propietarios - no debe afectar la devolución de espacios
          console.error(`[SpacesService] BASIC: Error al obtener propietarios:`, ownerError);
          console.log('[SpacesService] BASIC: Continuando con la operación, retornando espacios sin propietarios');
          return spacesWithTypes;
        }
        
        return spacesWithTypes;
      } catch (spacesError) {
        // Error al obtener espacios - este es crítico
        console.error(`[SpacesService] BASIC: Error al obtener espacios:`, spacesError);
        return [];
      }
    } catch (error) {
      // Error general
      console.error(`[SpacesService] BASIC: Error general en findAllSpacesSimplified:`, error);
      return [];
    }
  }
  
  async findAllSpaces(buildingId: string) {
    try {
      // Obtener el schema del building
      const building = await this.prisma.building.findUnique({
        where: { id: buildingId },
        select: { schema: true }
      });
      
      if (!building) {
        throw new Error(`Building con ID ${buildingId} no encontrado`);
      }
      
      console.log(`[SpacesService] Consultando espacios en schema: ${building.schema}`);
      
      // Usar consulta SQL directa para obtener los espacios con sus tipos
      const spacesQuery = `
        SELECT 
          s.id, 
          s.name, 
          s.floor, 
          s.description,
          s.space_type_id as "spaceTypeId",
          st.id as "type.id",
          st.name as "type.name",
          st.description as "type.description",
          st.is_reservable as "type.isReservable",
          st.is_assignable as "type.isAssignable"
        FROM "${building.schema}".spaces s
        LEFT JOIN "${building.schema}".space_types st ON s.space_type_id = st.id
        ORDER BY s.floor DESC, s.name ASC
      `;
      
      console.log(`[SpacesService] Ejecutando consulta de espacios`);
      
      const typedSpaces = await this.prisma.$queryRawUnsafe(spacesQuery) as any[];
      
      console.log(`[SpacesService] Espacios encontrados: ${typedSpaces.length}`);
      
      if (!typedSpaces.length) {
        return [];
      }
      
      // Extraer los IDs de los espacios para la consulta de propietarios
      const spaceIds = typedSpaces.map(space => space.id);
      
      // Definir tipo para los propietarios
      type OwnerResult = {
        id: string;
        spaceId: string;
        ownerId: string;
        isMain: boolean;
        firstName?: string;
        lastName?: string;
        email?: string;
      };
      
      // Variable para almacenar los propietarios
      let owners: OwnerResult[] = [];
      
      if (spaceIds.length > 0) {
        // Log del buildingId para verificar
        console.log(`[SpacesService] BuildingId consultado: ${buildingId}`);
        
        // Consultar directamente las tablas de propietarios para este edificio específico
        const ownersQuery = `
          SELECT 
            so.id,
            so.space_id as "spaceId",
            so.owner_id as "ownerId",
            so.is_main as "isMain",
            u.first_name as "firstName",
            u.last_name as "lastName",
            u.email as "email"
          FROM "${building.schema}".space_owners so
          LEFT JOIN public.users u ON so.owner_id = u.id
          WHERE so.space_id IN (${spaceIds.map(id => `'${id}'`).join(',')})
        `;
        
        console.log(`[SpacesService] Ejecutando consulta de propietarios: ${ownersQuery}`);
        
        try {
          // Obtenemos los propietarios
          owners = await this.prisma.$queryRawUnsafe(ownersQuery) as OwnerResult[];
          console.log(`[SpacesService] Total de propietarios encontrados: ${owners.length}`);
          
          // Buscamos específicamente si el propietario mencionado está en los resultados
          const specificOwner = owners.find(o => o.ownerId === 'dd230d73-6a35-4003-860c-d22467090b01');
          if (specificOwner) {
            console.log(`[SpacesService] ¡ENCONTRADO el propietario específico (juanvelasco9888@gmail.com) para espacio: ${specificOwner.spaceId}!`);
            console.log(`[SpacesService] Datos completos:`, JSON.stringify(specificOwner));
          } else {
            console.log(`[SpacesService] ATENCIÓN: NO se encontró el propietario con ID dd230d73-6a35-4003-860c-d22467090b01`);
          }
        } catch (error) {
          console.error('[SpacesService] Error al obtener propietarios:', error);
          // Continuamos con un array vacío de propietarios
          owners = [];
        }
      }
      
      // Log para verificar estructura de un espacio antes de formatear
      if (typedSpaces.length > 0) {
        console.log('[SpacesService] Ejemplo de espacio (sin formatear):', JSON.stringify(typedSpaces[0]));
      }
      
      // Crear espacios formateados
      const formattedSpaces: any[] = [];
      
      // Por cada espacio, formatear y asignarle sus propietarios
      for (const space of typedSpaces) {
        // Extraer y formatear los datos del tipo de espacio
        const spaceType = {
          id: space['type.id'],
          name: space['type.name'],
          isReservable: space['type.isReservable'],
          isAssignable: space['type.isAssignable']
        };
        
        // Filtrar los propietarios que pertenecen a este espacio con comparación más robusta
        console.log(`[SpacesService] Buscando propietarios para espacio ID: ${space.id}, tipo: ${typeof space.id}`);
        
        // Comparamos como strings para evitar problemas de tipo UUID vs String
        const spaceOwners = owners.filter(owner => {
          console.log(`Comparando: space.id=${space.id} con owner.spaceId=${owner.spaceId}`);
          return String(owner.spaceId) === String(space.id);
        });
        
        // Si hay propietarios, mostrar detalles de depuración
        if (spaceOwners.length > 0) {
          console.log(`[SpacesService] IMPORTANTE: El espacio ${space.id} (${space.name}) tiene ${spaceOwners.length} propietario(s)`);
          console.log(JSON.stringify(spaceOwners));
        } else {
          console.log(`[SpacesService] ATENCIÓN: No se encontraron propietarios para el espacio ${space.id} (${space.name})`);
          // Diagnóstico adicional: mostrar los IDs disponibles en owners para debug
          console.log(`[SpacesService] IDs de espacios disponibles en owners: ${JSON.stringify(owners.map(o => o.spaceId))}`);
        }
        
        // Formatear los propietarios según lo que espera el frontend
        const formattedOwners = spaceOwners.map(owner => ({
          id: owner.ownerId,  // CAMBIO IMPORTANTE: debemos usar ownerId que corresponde al usuario en public.users
          firstName: owner.firstName || '',  // Asegurarnos de que no sea null/undefined
          lastName: owner.lastName || '',     // Asegurarnos de que no sea null/undefined
          isMain: owner.isMain,
          email: owner.email
        }));
        
        // Construir el objeto Space con el formato esperado
        const formattedSpace = {
          id: space.id,
          name: space.name,
          floor: space.floor,
          description: space.description,
          spaceTypeId: space.spaceTypeId,
          createdAt: space.createdAt,
          updatedAt: space.updatedAt,
          type: spaceType,
          owners: formattedOwners,  // Asignar los propietarios formateados
          claims: []  // Inicialmente vacío
        };
        
        // Añadir al array de espacios formateados
        formattedSpaces.push(formattedSpace);
      }
      
      console.log(`[SpacesService] Total de espacios formateados: ${formattedSpaces.length}`);
      if (formattedSpaces.length > 0) {
        console.log('[SpacesService] Ejemplo de espacio (formateado):', JSON.stringify(formattedSpaces[0]));
      }
      
      return formattedSpaces;
    } catch (error) {
      console.error('[SpacesService] Error al obtener espacios:', error);
      throw error;
    }
  }
  
  async debugOwnersData(buildingId: string) {
    try {
      console.log(`[SpacesService] DEBUG: Analizando propietarios para building ${buildingId}`);
      
      // 1. Verificar que el edificio existe y obtener el schema
      const building = await this.prisma.building.findUnique({
        where: { id: buildingId },
        select: { schema: true }
      });
      
      if (!building) {
        return { error: `Building con ID ${buildingId} no encontrado` };
      }
      
      // 2. Obtener IDs de todos los espacios
      const spacesQuery = `
        SELECT id, name 
        FROM "${building.schema}".spaces
        ORDER BY name
      `;
      
      const spaces = await this.prisma.$queryRawUnsafe(spacesQuery) as any[];
      console.log(`[DEBUG] Encontrados ${spaces.length} espacios`);
      
      // 3. Verificar propietarios directamente
      const ownersQuery = `
        SELECT 
          so.id as "relationId",
          so.space_id as "spaceId",
          so.owner_id as "ownerId",
          so.is_main as "isMain",
          u.first_name as "firstName",
          u.last_name as "lastName",
          u.email as "email"
        FROM "${building.schema}".space_owners so
        LEFT JOIN public.users u ON so.owner_id = u.id
      `;
      
      const owners = await this.prisma.$queryRawUnsafe(ownersQuery) as any[];
      console.log(`[DEBUG] Encontrados ${owners.length} propietarios en total`)
      
      // 4. Construir una estructura completa de diagnóstico
      const spacesWithOwners = spaces.map(space => {
        const spaceOwners = owners.filter(owner => owner.spaceId === space.id);
        
        return {
          spaceId: space.id,
          spaceName: space.name,
          hasOwners: spaceOwners.length > 0,
          ownerCount: spaceOwners.length,
          owners: spaceOwners.map(owner => ({
            relationId: owner.relationId,
            spaceId: owner.spaceId, 
            ownerId: owner.ownerId,
            isMain: owner.isMain,
            firstName: owner.firstName,
            lastName: owner.lastName,
            email: owner.email
          }))
        };
      });
      
      // 5. Devolver la información de diagnóstico
      return {
        buildingId,
        schema: building.schema,
        totalSpaces: spaces.length,
        totalOwners: owners.length,
        spacesWithOwners: spacesWithOwners.filter(s => s.hasOwners),
        spacesWithoutOwners: spacesWithOwners.filter(s => !s.hasOwners),
        rawOwnersData: owners
      };
      
    } catch (error) {
      console.error('[SpacesService] Error en diagnóstico de propietarios:', error);
      return { 
        error: 'Error al obtener datos de diagnóstico',
        message: error.message,
        stack: error.stack 
      };
    }
  }

  async findSpace(buildingId: string, id: string) {
    try {
      console.log(`[SpacesService] Buscando espacio con ID ${id} en building ${buildingId}`);
      
      // Obtener el schema del building
      const building = await this.prisma.building.findUnique({
        where: { id: buildingId },
        select: { schema: true }
      });
      
      if (!building) {
        throw new Error(`Building con ID ${buildingId} no encontrado`);
      }
      
      const schema = building.schema;
      console.log(`[SpacesService] Schema del building: ${schema}`);
      
      // Obtener el espacio y su tipo usando SQL directo
      const spaceQuery = `
        SELECT 
          s.id, 
          s.name, 
          s.floor, 
          s.description,
          s.space_type_id as "spaceTypeId",
          s.created_at as "createdAt",
          s.updated_at as "updatedAt",
          st.id as "type.id",
          st.name as "type.name",
          st.description as "type.description",
          st.is_reservable as "type.isReservable",
          st.is_assignable as "type.isAssignable"
        FROM "${schema}".spaces s
        LEFT JOIN "${schema}".space_types st ON s.space_type_id = st.id
        WHERE s.id = '${id}'::uuid
      `;
      
      const spaceResult = await this.prisma.$queryRawUnsafe(spaceQuery) as any[];
      
      if (!spaceResult.length) {
        throw new Error(`Espacio con ID ${id} no encontrado`);
      }
      
      // Procesar el resultado para mantener la estructura esperada
      const space = spaceResult[0];
      
      // Reformatear los datos para que coincidan con la estructura esperada por el frontend
      const formattedSpace = {
        id: space.id,
        name: space.name,
        floor: space.floor,
        description: space.description,
        spaceTypeId: space.spaceTypeId,
        createdAt: space.createdAt,
        updatedAt: space.updatedAt,
        type: {
          id: space["type.id"],
          name: space["type.name"],
          description: space["type.description"],
          isReservable: space["type.isReservable"],
          isAssignable: space["type.isAssignable"]
        },
        owners: [] as any[],
        claims: [] as any[]
      };
      
      // Obtener los propietarios del espacio
      try {
        const ownersQuery = `
          SELECT 
            so.id,
            so.owner_id as "ownerId",
            so.is_main as "isMain",
            u."first_name" as "firstName",
            u."last_name" as "lastName",
            u.email as "email"
          FROM "${schema}".space_owners so
          LEFT JOIN public.users u ON so.owner_id = u.id
          WHERE so.space_id = '${id}'::uuid
        `;
        
        const ownersResult = await this.prisma.$queryRawUnsafe(ownersQuery) as any[];
        
        if (ownersResult.length > 0) {
          // Formatear los propietarios para que coincidan con la estructura esperada por el frontend
          formattedSpace.owners = ownersResult.map(owner => ({
            id: owner.ownerId,  // CAMBIO: usar ownerId en lugar de id para que coincida con el ID de usuario
            firstName: owner.firstName || '',
            lastName: owner.lastName || '',
            isMain: owner.isMain,
            email: owner.email
          }));
        }
      } catch (ownersError) {
        console.error(`[SpacesService] Error al obtener propietarios:`, ownersError);
        // No falla si no puede obtener los propietarios
      }
      
      // Intentar obtener reclamos recientes si la tabla existe
      try {
        const claimsTableExists = await this.prisma.$queryRawUnsafe(`
          SELECT EXISTS (
            SELECT FROM pg_tables
            WHERE schemaname = '${schema}' AND tablename = 'claims'
          ) as "exists";
        `) as [{exists: boolean}];
        
        if (claimsTableExists[0].exists) {
          const claimsQuery = `
            SELECT 
              c.id,
              c.title,
              c.description,
              c.status,
              c.created_at as "createdAt"
            FROM "${schema}".claims c
            WHERE c.space_id = '${id}'::uuid
            ORDER BY c.created_at DESC
            LIMIT 5
          `;
          
          const claimsResult = await this.prisma.$queryRawUnsafe(claimsQuery) as any[];
          
          if (claimsResult.length > 0) {
            formattedSpace.claims = claimsResult;
          }
        }
      } catch (claimsError) {
        console.error(`[SpacesService] Error al obtener reclamos:`, claimsError);
        // No falla si no puede obtener los reclamos
      }
      
      console.log(`[SpacesService] Espacio encontrado:`, formattedSpace);
      return formattedSpace;
    } catch (error) {
      console.error(`[SpacesService] Error al buscar espacio:`, error);
      throw error;
    }
  }

  /**
   * Actualiza un espacio existente con nuevos datos
   */
  async updateSpace(buildingId: string, id: string, updateSpaceDto: CreateSpaceDto) {
    try {
      console.log(`[SpacesService] Actualizando espacio ${id} en building ${buildingId}`, updateSpaceDto);
      
      // Obtener el schema del building
      const building = await this.prisma.building.findUnique({
        where: { id: buildingId },
        select: { schema: true }
      });
      
      if (!building) {
        throw new Error(`Building con ID ${buildingId} no encontrado`);
      }
      
      const schema = building.schema;
      console.log(`[SpacesService] Schema del building: ${schema}`);
      
      // Usaremos un enfoque diferente, más sencillo y directo con SQL plano
      let updateQuery = `
        UPDATE "${schema}".spaces
        SET updated_at = NOW()
      `;
      
      // Agregar cada campo a actualizar si está definido
      if (updateSpaceDto.name !== undefined) {
        updateQuery += `, name = '${updateSpaceDto.name.replace(/'/g, "''")}'`;
      }
      
      if (updateSpaceDto.description !== undefined) {
        updateQuery += `, description = '${updateSpaceDto.description ? updateSpaceDto.description.replace(/'/g, "''") : null}'`;
      }
      
      if (updateSpaceDto.floor !== undefined) {
        updateQuery += `, floor = '${updateSpaceDto.floor ? updateSpaceDto.floor.replace(/'/g, "''") : null}'`;
      }
      
      if (updateSpaceDto.spaceTypeId !== undefined) {
        updateQuery += `, space_type_id = '${updateSpaceDto.spaceTypeId}'::uuid`;
      }
      
      // Completar la consulta con la cláusula WHERE
      updateQuery += `
        WHERE id = '${id}'::uuid
        RETURNING id, name, description, floor, space_type_id as "spaceTypeId"
      `;
      
      console.log(`[SpacesService] Ejecutando consulta:`, updateQuery);
      
      // Ejecutar la consulta y obtener el resultado
      const result = await this.prisma.$queryRawUnsafe(updateQuery) as any[];
      
      console.log(`[SpacesService] Resultado de actualización:`, result);
      
      if (!result.length) {
        throw new Error(`No se pudo actualizar el espacio con ID ${id}`);
      }
      
      // Devolver el espacio actualizado con todos sus datos relacionados
      return await this.findSpace(buildingId, id);
    } catch (error) {
      console.error(`[SpacesService] Error al actualizar espacio:`, error);
      throw error;
    }
  }

  /**
   * Verifica si un espacio tiene reclamos asociados
   * @param buildingId ID del edificio
   * @param spaceId ID del espacio
   * @returns Verdadero si tiene reclamos asociados, falso en caso contrario
   */
  async hasAssociatedClaims(buildingId: string, spaceId: string): Promise<boolean> {
    try {
      // Obtener el schema del building
      const building = await this.prisma.building.findUnique({
        where: { id: buildingId },
        select: { schema: true }
      });
      
      if (!building) {
        throw new Error(`Building con ID ${buildingId} no encontrado`);
      }
      
      // Verificar si existe la tabla de claims en este schema
      // Si la tabla no existe, no puede haber reclamos asociados
      const tableExists = await this.prisma.$queryRawUnsafe(`
        SELECT EXISTS (
          SELECT FROM pg_tables
          WHERE schemaname = '${building.schema}'
          AND tablename = 'claims'
        ) as "exists";
      `) as [{exists: boolean}];
      
      if (!tableExists[0].exists) {
        return false; // No hay tabla de claims, así que no hay asociaciones
      }
      
      // Verificar si existen claims asociados al espacio
      const claimsCount = await this.prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as count
        FROM "${building.schema}".claims
        WHERE space_id = '${spaceId}';
      `) as [{count: number}];
      
      console.log(`[SpacesService] Encontrados ${claimsCount[0].count} reclamos asociados al espacio ${spaceId}`);
      
      return claimsCount[0].count > 0;
    } catch (error) {
      // Si hay un error porque la tabla no existe, consideramos que no hay reclamos
      if (error.message.includes('does not exist')) {
        return false;
      }
      console.error(`[SpacesService] Error al verificar reclamos asociados:`, error);
      throw error;
    }
  }

  /**
   * Elimina un espacio verificando primero si tiene reclamos asociados
   */
  async removeSpace(buildingId: string, id: string) {
    try {
      console.log(`[SpacesService] Eliminando espacio ${id} de building ${buildingId}`);
      
      // Verificar si tiene reclamos asociados
      const hasAssociatedClaims = await this.hasAssociatedClaims(buildingId, id);
      
      if (hasAssociatedClaims) {
        throw new Error('No se puede eliminar un espacio que tiene reclamos asociados');
      }
      
      // Obtener el schema del building
      const building = await this.prisma.building.findUnique({
        where: { id: buildingId },
        select: { schema: true }
      });
      
      if (!building) {
        throw new Error(`Building con ID ${buildingId} no encontrado`);
      }
      
      // Eliminar primero los propietarios asociados (si existen)
      await this.prisma.$executeRawUnsafe(`
        DELETE FROM "${building.schema}".space_owners
        WHERE space_id = '${id}'::uuid;
      `);
      
      // Luego eliminar el espacio
      const result = await this.prisma.$executeRawUnsafe(`
        DELETE FROM "${building.schema}".spaces
        WHERE id = '${id}'::uuid
        RETURNING id;
      `);
      
      // Convertir el resultado a un formato más seguro
      const parsedResult = result as unknown as any[];
      
      if (!parsedResult.length) {
        throw new Error(`El espacio con ID ${id} no existe`);
      }
      
      return { success: true, message: 'Espacio eliminado correctamente' };
    } catch (error) {
      console.error(`[SpacesService] Error al eliminar espacio:`, error);
      throw error;
    }
  }

  async generateUnits(buildingId: string, generateUnitsDto: GenerateUnitsDto) {
    try {
      console.log(`[SpacesService] Iniciando generación de unidades para building ${buildingId}`);
      console.log(`[SpacesService] DTO recibido:`, JSON.stringify(generateUnitsDto, null, 2));
      
      // Obtener el building para acceder al schema
      const building = await this.prisma.building.findUnique({
        where: { id: buildingId },
        select: { schema: true, name: true }
      });
      
      if (!building) {
        throw new Error(`Building con ID ${buildingId} no encontrado`);
      }
      
      console.log(`[SpacesService] Usando schema del building: ${building.schema} (${building.name})`);
      
      // Desestructurar las propiedades del DTO
      const { 
        floors, 
        unitsPerFloor, 
        nomenclature, 
        hasBasement, 
        basementCount,
        hasGroundFloor,
        customFloors,
        typeId,
        prefix = '',
        suffix = '',
        customPattern = '',
      } = generateUnitsDto;
      
      // Array para almacenar todas las unidades a crear
      const units: {
        name: string;
        floor: string;
        description: string | null;
        space_type_id: string;
      }[] = [];
      
      // Buscar el tipo de espacio (Unidad)
      let unitType: any = null;
      
      if (typeId) {
        console.log(`[SpacesService] Buscando tipo de espacio por ID: ${typeId}`);
        try {
          // Usar SQL directo para buscar el tipo de espacio con el schema específico
          const spaceTypeResult = await this.prisma.$queryRawUnsafe(`
            SELECT id, name, description
            FROM "${building.schema}".space_types
            WHERE id = $1::uuid
          `, typeId) as any[];
          
          if (spaceTypeResult && spaceTypeResult.length > 0) {
            unitType = spaceTypeResult[0];
            console.log(`[SpacesService] Tipo de espacio encontrado:`, unitType);
          } else {
            throw new Error(`Tipo de espacio con ID ${typeId} no encontrado en el schema ${building.schema}`);
          }
        } catch (error) {
          console.error(`[SpacesService] Error al buscar tipo de espacio:`, error);
          throw new Error(`Error al buscar tipo de espacio: ${error.message}`);
        }
      } else {
        throw new Error('Se requiere un ID de tipo de espacio (typeId) para generar unidades');
      }
      
      // Si hay pisos personalizados, procesarlos primero
      if (customFloors && customFloors.length > 0) {
        console.log(`[SpacesService] Procesando ${customFloors.length} pisos personalizados`);
        
        for (const customFloor of customFloors) {
          const { floorNumber, units: customUnits } = customFloor;
          console.log(`[SpacesService] Procesando piso personalizado ${floorNumber} con ${customUnits.length} unidades`);
          
          for (const customUnit of customUnits) {
            units.push({
              name: customUnit.name,
              floor: floorNumber,
              description: customUnit.description || `Unidad ${customUnit.name} en piso ${floorNumber}`,
              space_type_id: unitType.id,
            });
          }
        }
      }
      
      // Generar unidades para subsuelo si está habilitado
      if (hasBasement) {
        const basementFloors = basementCount || 1;
        console.log(`[SpacesService] Generando unidades para ${basementFloors} subsuelo(s)`);
        
        for (let i = 1; i <= basementFloors; i++) {
          const floorName = `SS${i}`;
          
          for (let j = 1; j <= unitsPerFloor; j++) {
            const unitName = this.generateUnitName(
              j,
              nomenclature,
              floorName,
              prefix,
              suffix,
              customPattern,
            );
            
            units.push({
              name: unitName,
              floor: floorName,
              description: `Unidad ${unitName} en subsuelo ${i}`,
              space_type_id: unitType.id,
            });
          }
        }
      }
      
      // Generar unidades para planta baja si está habilitada
      if (hasGroundFloor) {
        console.log(`[SpacesService] Generando unidades para planta baja`);
        const floorName = 'PB';
        
        for (let j = 1; j <= unitsPerFloor; j++) {
          const unitName = this.generateUnitName(
            j,
            nomenclature,
            floorName,
            prefix,
            suffix,
            customPattern,
          );
          
          units.push({
            name: unitName,
            floor: floorName,
            description: `Unidad ${unitName} en planta baja`,
            space_type_id: unitType.id,
          });
        }
      }
      
      // Generar unidades para pisos estándar
      console.log(`[SpacesService] Generando unidades para ${floors} pisos estándar`);
      for (let i = 1; i <= floors; i++) {
        const floorName = `${i}`;
        console.log(`[SpacesService] Generando unidades para piso ${floorName}`);
        
        for (let j = 1; j <= unitsPerFloor; j++) {
          const unitName = this.generateUnitName(
            j,
            nomenclature,
            floorName,
            prefix,
            suffix,
            customPattern,
          );
          
          units.push({
            name: unitName,
            floor: floorName,
            description: `Unidad ${unitName} en piso ${i}`,
            space_type_id: typeId
          });
        }
      }

      return units;
    } catch (error) {
      console.error(`[SpacesService] Error al generar unidades:`, error);
      throw error;
    }
  }

  async assignOwnerToSpace(buildingId: string, spaceId: string, assignOwnerDto: AssignOwnerDto) {
    try {
      console.log(`[SpacesService] Asignando propietario al espacio ${spaceId} en building ${buildingId}`);
      
      // Verificar que el usuario/propietario existe
      const user = await this.prisma.user.findUnique({
        where: { id: assignOwnerDto.ownerId }
      });
      
      if (!user) {
        console.error(`[SpacesService] Error: Usuario/propietario con ID ${assignOwnerDto.ownerId} no encontrado`);
        throw new Error(`Propietario con ID ${assignOwnerDto.ownerId} no encontrado`);
      }
      
      // Verificar que el usuario tiene rol OWNER
      if (user.role !== 'OWNER') {
        console.error(`[SpacesService] Error: El usuario ${assignOwnerDto.ownerId} no tiene rol OWNER`);
        throw new Error(`El usuario seleccionado no tiene rol de propietario`);
      }
      
      const buildingClient = await this.prisma.getBuildingClient(buildingId);
      
      if (!buildingClient) {
        console.error(`[SpacesService] Error: No se pudo obtener el cliente para el edificio ${buildingId}`);
        throw new Error(`No se pudo obtener cliente para el edificio: ${buildingId}`);
      }
      
      // Utilizar consulta SQL directa para evitar problemas de nomenclatura entre Prisma (camelCase) y SQL (snake_case)
      try {
        // 1. Verificar si el espacio existe y obtener su spaceTypeId
        console.log(`[SpacesService] Verificando espacio con ID ${spaceId} usando SQL directo`);
        const spaceResult = await buildingClient.$queryRawUnsafe<{id: string, space_type_id: string}[]>(`
          SELECT id, space_type_id FROM spaces WHERE id = '${spaceId}';
        `);
        
        if (!spaceResult || spaceResult.length === 0) {
          console.error(`[SpacesService] Error: Espacio con ID ${spaceId} no encontrado`);
          throw new Error(`Espacio con ID ${spaceId} no encontrado`);
        }
        
        const space = spaceResult[0];
        console.log(`[SpacesService] Espacio encontrado:`, space);
        
        // 2. Verificar si el tipo de espacio es asignable
        const spaceTypeResult = await buildingClient.$queryRawUnsafe<{id: string, is_assignable: boolean}[]>(`
          SELECT id, is_assignable FROM space_types WHERE id = '${space.space_type_id}';
        `);
        
        if (!spaceTypeResult || spaceTypeResult.length === 0) {
          console.error(`[SpacesService] Error: SpaceType con ID ${space.space_type_id} no encontrado`);
          throw new Error(`Tipo de espacio no encontrado`);
        }
        
        const spaceType = spaceTypeResult[0];
        console.log(`[SpacesService] Tipo de espacio encontrado:`, spaceType);
        
        if (!spaceType.is_assignable) {
          console.error(`[SpacesService] Error: El espacio no es de tipo asignable`);
          throw new Error(`Este tipo de espacio no permite asignación de propietarios`);
        }
        
        // 3. Verificar si ya existe asignación
        const existingAssignmentResult = await buildingClient.$queryRawUnsafe<{id: string, is_main: boolean}[]>(`
          SELECT id, is_main FROM space_owners 
          WHERE space_id = '${spaceId}' AND owner_id = '${assignOwnerDto.ownerId}';
        `);
        
        // 4. Si ya existe, actualizar isMain si es necesario
        if (existingAssignmentResult && existingAssignmentResult.length > 0) {
          const existingAssignment = existingAssignmentResult[0];
          console.log(`[SpacesService] Asignación existente encontrada:`, existingAssignment);
          
          // Actualizar solo si isMain es diferente
          if (assignOwnerDto.isMain !== existingAssignment.is_main) {
            // Si marcamos como principal, quitar principal anterior
            if (assignOwnerDto.isMain) {
              await buildingClient.$executeRawUnsafe(`
                UPDATE space_owners SET is_main = FALSE 
                WHERE space_id = '${spaceId}' AND is_main = TRUE;
              `);
            }
            
            // Actualizar asignación existente
            await buildingClient.$executeRawUnsafe(`
              UPDATE space_owners SET is_main = ${assignOwnerDto.isMain}, 
              updated_at = CURRENT_TIMESTAMP
              WHERE id = '${existingAssignment.id}';
            `);
            
            console.log(`[SpacesService] Actualizada asignación existente a isMain=${assignOwnerDto.isMain}`);
          }
          
          // Obtener datos actualizados
          const updatedAssignment = await buildingClient.$queryRawUnsafe<{id: string, space_id: string, owner_id: string, is_main: boolean}[]>(`
            SELECT * FROM space_owners WHERE id = '${existingAssignment.id}';
          `);
          
          return updatedAssignment[0];
        }
        
        // 5. Si no existe, crear nueva asignación
        // Si marcamos como principal, quitar principal anterior
        if (assignOwnerDto.isMain) {
          await buildingClient.$executeRawUnsafe(`
            UPDATE space_owners SET is_main = FALSE 
            WHERE space_id = '${spaceId}' AND is_main = TRUE;
          `);
        }
        
        // Crear asignación
        const newAssignmentResult = await buildingClient.$queryRawUnsafe<{id: string}[]>(`
          INSERT INTO space_owners (space_id, owner_id, is_main) 
          VALUES ('${spaceId}', '${assignOwnerDto.ownerId}', ${assignOwnerDto.isMain || false}) 
          RETURNING *;
        `);
        
        if (!newAssignmentResult || newAssignmentResult.length === 0) {
          throw new Error('Error al crear asignación: No se devolvió ningún resultado');
        }
        
        console.log(`[SpacesService] Propietario asignado exitosamente:`, newAssignmentResult[0]);
        return newAssignmentResult[0];
        
      } catch (sqlError) {
        console.error(`[SpacesService] Error en consulta SQL:`, sqlError);
        throw new Error(`Error al procesar asignación de propietario: ${sqlError.message}`);
      }
    } catch (error) {
      console.error(`[SpacesService] Error al asignar propietario:`, error);
      throw error;
    }
  }

  async removeOwnerFromSpace(buildingId: string, spaceId: string, ownerId: string) {
    try {
      console.log(`[SpacesService] Eliminando propietario ${ownerId} del espacio ${spaceId} en building ${buildingId}`);
      
      // Obtenemos directamente el schema del building
      const building = await this.prisma.building.findUnique({
        where: { id: buildingId },
        select: { schema: true }
      });
      
      if (!building) {
        throw new Error(`Building con ID ${buildingId} no encontrado`);
      }
      
      console.log(`[SpacesService] Schema del building: ${building.schema}`);
      
      const buildingClient = await this.prisma.getBuildingClient(buildingId);
      
      if (!buildingClient) {
        console.error(`[SpacesService] Error: No se pudo obtener el cliente para el edificio ${buildingId}`);
        throw new Error(`Could not get client for building: ${buildingId}`);
      }
      
      try {
        // Buscar la asignación existente usando SQL directo con snake_case
        const assignmentResult = await buildingClient.$queryRawUnsafe<{id: string, is_main: boolean}[]>(`
          SELECT id, is_main FROM "${building.schema}".space_owners 
          WHERE space_id = '${spaceId}' AND owner_id = '${ownerId}'
          LIMIT 1;
        `);
        
        if (!assignmentResult || assignmentResult.length === 0) {
          throw new Error(`Asignación de propietario ${ownerId} a espacio ${spaceId} no encontrada`);
        }
        
        const assignment = assignmentResult[0];
        const wasMainOwner = assignment.is_main;
        
        // Eliminar la asignación usando SQL directo
        await buildingClient.$executeRawUnsafe(`
          DELETE FROM "${building.schema}".space_owners 
          WHERE id = '${assignment.id}';
        `);
        
        console.log(`[SpacesService] Propietario eliminado exitosamente del espacio. Era propietario principal: ${wasMainOwner}`);
        return { 
          success: true, 
          message: 'Propietario eliminado del espacio', 
          wasMainOwner: wasMainOwner 
        };
      } catch (sqlError) {
        console.error(`[SpacesService] Error en consulta SQL:`, sqlError);
        throw new Error(`Error al procesar eliminación de propietario: ${sqlError.message}`);
      }
    } catch (error) {
      console.error(`[SpacesService] Error al eliminar propietario de espacio:`, error);
      throw error;
    }
  }

  // Helper method to generate unit names based on nomenclature type and other parameters
  private generateUnitName(
    unitNumber: number,
    nomenclature: NomenclatureType,
    floorName: string,
    prefix: string = '',
    suffix: string = '',
    customPattern: string = '',
  ): string {
    // If a custom pattern is provided, use it
    if (customPattern) {
      return customPattern
        .replace('{floor}', floorName)
        .replace('{unit}', unitNumber.toString())
        .replace('{prefix}', prefix)
        .replace('{suffix}', suffix);
    }
    
    // Otherwise use the nomenclature type to determine the format
    switch (nomenclature) {
      case NomenclatureType.NUMBERS:
        return `${prefix}${floorName}${unitNumber.toString().padStart(2, '0')}${suffix}`;
      
      case NomenclatureType.LETTERS:
        // Convert unit number to letter (1=A, 2=B, etc.)
        const letter = String.fromCharCode(64 + unitNumber); // ASCII: A=65, so 1+64=65=A
        return `${prefix}${floorName}${letter}${suffix}`;
      
      case NomenclatureType.CUSTOM:
        // With custom type but no pattern provided, use a default format
        return `${prefix}${floorName}-${unitNumber.toString().padStart(2, '0')}${suffix}`;
      
      default:
        // Default to NUMBERS if nomenclature is not recognized
        return `${prefix}${floorName}${unitNumber.toString().padStart(2, '0')}${suffix}`;
    }
  }
}
