import { PrismaClient, PlanType } from '@prisma/client';

const prisma = new PrismaClient();

async function createPlan() {
  try {
    const plan = await prisma.plan.create({
      data: {
        id: 'plan_free',
        type: PlanType.FREE,
        name: 'Plan Free',
        description: 'Plan gratuito',

        price: 0,
        features: ['Gestión básica'],
        updatedAt: new Date()
      },
    });
    console.log('Plan created successfully:', plan);
  } catch (error) {
    console.error('Error creating plan:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createPlan();
