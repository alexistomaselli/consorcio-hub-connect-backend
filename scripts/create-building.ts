import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createBuilding() {
  try {
    const building = await prisma.building.create({
      data: {
        id: 'dae456a6-6c6f-4f4c-92fa-c5ec6ab14eaa',
        name: 'Edificio Test',
        adminId: 'sebastianvettel01',
        planId: 'plan_free',  // Este ID viene del seeder de planes
        updatedAt: new Date(),
        address: '',
        schema: 'building_dae456a6'
      },
    });
    console.log('Building created successfully:', building);
  } catch (error) {
    console.error('Error creating building:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createBuilding();
