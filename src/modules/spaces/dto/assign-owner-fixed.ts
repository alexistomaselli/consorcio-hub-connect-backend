import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AssignOwnerDto } from '../dto/assign-owner.dto';
import { PrismaClient } from '@prisma/client';

// Type augmentation para el cliente Prisma de edificios
interface BuildingPrismaClient extends PrismaClient {
  space: any;
  spaceType: any;
  spaceOwner: any;
}

@Injectable()
export class SpacesOwnerService {
  constructor(private prisma: PrismaService) {}

  /**
   * Asigna un propietario a un espacio
   * Corrige la implementación original que tenía errores estructurales
   */
  async assignOwnerToSpace(buildingId: string, spaceId: string, assignOwnerDto: AssignOwnerDto) {
    try {
      console.log(`[SpacesService] Asignando propietario a espacio ${spaceId} en building ${buildingId}:`, assignOwnerDto);
      
      // Verificar que el propietario (usuario) existe en la tabla users
      const user = await this.prisma.user.findUnique({
        where: { id: assignOwnerDto.ownerId }
      });
      
      if (!user) {
        console.error(`[SpacesService] Error: Usuario/propietario con ID ${assignOwnerDto.ownerId} no encontrado`);
        throw new Error(`Propietario con ID ${assignOwnerDto.ownerId} no encontrado`);
      }
      
      // Verificar que el usuario tiene rol OWNER
      if (user.role !== 'OWNER') {
        console.error(`[SpacesService] Error: El usuario ${assignOwnerDto.ownerId} no tiene rol OWNER, tiene rol ${user.role}`);
        throw new Error(`El usuario seleccionado no tiene rol de propietario`);
      }
      
      // Usamos type assertion para indicar a TypeScript que este cliente tiene los modelos de edificio
      const buildingClient = await this.prisma.getBuildingClient(buildingId) as BuildingPrismaClient;
      
      if (!buildingClient) {
        console.error(`[SpacesService] Error: No se pudo obtener el cliente para el edificio ${buildingId}`);
        throw new Error(`No se pudo obtener cliente para el edificio: ${buildingId}`);
      }
      
      // Verificar si el espacio existe
      const space = await buildingClient.space.findUnique({
        where: { id: spaceId }
      });
      
      if (!space) {
        console.error(`[SpacesService] Error: Espacio con ID ${spaceId} no encontrado`);
        throw new Error(`Espacio con ID ${spaceId} no encontrado`);
      }
      
      // Verificar si el espacio es de tipo asignable
      const spaceType = await buildingClient.spaceType.findUnique({
        where: { id: space.spaceTypeId }
      });
      
      if (!spaceType?.isAssignable) {
        console.error(`[SpacesService] Error: El espacio no es de tipo asignable`);
        throw new Error(`Este tipo de espacio no permite asignación de propietarios`);
      }
      
      // Verificar si el propietario ya está asignado a este espacio
      const existingAssignment = await buildingClient.spaceOwner.findFirst({
        where: {
          spaceId: spaceId,
          ownerId: assignOwnerDto.ownerId
        }
      });
      
      if (existingAssignment) {
        console.log(`[SpacesService] El propietario ya está asignado a este espacio, actualizando isMain`);
        // Actualizar isMain si es necesario
        if (assignOwnerDto.isMain !== existingAssignment.isMain) {
          // Si estamos marcando como principal, primero quitamos el principal actual
          if (assignOwnerDto.isMain) {
            await buildingClient.spaceOwner.updateMany({
              where: {
                spaceId: spaceId,
                isMain: true
              },
              data: {
                isMain: false
              }
            });
          }
          
          // Actualizar la asignación existente
          return buildingClient.spaceOwner.update({
            where: { id: existingAssignment.id },
            data: { isMain: assignOwnerDto.isMain }
          });
        }
        
        return existingAssignment;
      }
      
      // Si estamos marcando como principal, primero quitamos el principal actual
      if (assignOwnerDto.isMain) {
        await buildingClient.spaceOwner.updateMany({
          where: {
            spaceId: spaceId,
            isMain: true
          },
          data: {
            isMain: false
          }
        });
      }
      
      try {
        // Crear la nueva asignación
        const result = await buildingClient.spaceOwner.create({
          data: {
            spaceId: spaceId,
            ownerId: assignOwnerDto.ownerId,
            isMain: assignOwnerDto.isMain || false
          }
        });
        
        console.log(`[SpacesService] Propietario asignado exitosamente:`, result);
        return result;
      } catch (createError) {
        console.error(`[SpacesService] Error al crear la asignación:`, createError);
        throw new Error(`Error al crear la asignación: ${createError.message}`);
      }
    } catch (error) {
      console.error(`[SpacesService] Error al asignar propietario a espacio:`, error);
      throw error;
    }
  }

  /**
   * Elimina un propietario de un espacio
   */
  async removeOwnerFromSpace(buildingId: string, spaceId: string, ownerId: string) {
    try {
      console.log(`[SpacesService] Eliminando propietario ${ownerId} del espacio ${spaceId} en building ${buildingId}`);
      
      // Usamos type assertion para indicar a TypeScript que este cliente tiene los modelos de edificio
      const buildingClient = await this.prisma.getBuildingClient(buildingId) as BuildingPrismaClient;
      
      if (!buildingClient) {
        throw new Error(`Could not get client for building: ${buildingId}`);
      }
      
      // Buscar la asignación existente
      const assignment = await buildingClient.spaceOwner.findFirst({
        where: {
          spaceId: spaceId,
          ownerId: ownerId
        }
      });
      
      if (!assignment) {
        throw new Error(`Asignación de propietario ${ownerId} a espacio ${spaceId} no encontrada`);
      }
      
      // Eliminar la asignación
      const result = await buildingClient.spaceOwner.delete({
        where: { id: assignment.id }
      });
      
      console.log(`[SpacesService] Propietario eliminado exitosamente del espacio`);
      return { success: true, message: 'Propietario eliminado del espacio' };
    } catch (error) {
      console.error(`[SpacesService] Error al eliminar propietario de espacio:`, error);
      throw error;
    }
  }
}
