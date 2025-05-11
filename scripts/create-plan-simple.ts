import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createPlan() {
  try {
    const plan = await prisma.$queryRaw`
      INSERT INTO "Plan" (id, type, name, description, "maxUnits", price, features, "updatedAt")
      VALUES ('plan_free', 'FREE', 'Plan Free', 'Plan gratuito', 10, 0, ARRAY['Gestión básica'], NOW())
      RETURNING *;
    `;
    console.log('Plan created successfully:', plan);
  } catch (error) {
    console.error('Error creating plan:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createPlan();
