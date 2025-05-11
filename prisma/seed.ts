import { PrismaClient, PlanType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Crear los planes por defecto
  const plans = [
    {
      type: PlanType.FREE,
      name: 'Free',
      description: 'Para comenzar a gestionar su edificio',
      price: 0,
      features: [
        'Prueba gratuita por 14 días',
        'Acceso a todas las funcionalidades',
        'Sin límite de unidades durante el trial',
        'No requiere tarjeta de crédito',
        'Soporte por email incluido'
      ]
    },
    {
      type: PlanType.BASIC,
      name: 'Basic',
      description: 'Para edificios pequeños',
      price: 15,
      features: [
        'Todo lo del plan Free',
        'Sin límite de tiempo',
        'Hasta 20 unidades',
        'Soporte prioritario',
        'Reportes básicos'
      ]
    },
    {
      type: PlanType.PRO,
      name: 'Pro',
      description: 'Para edificios medianos',
      price: 29,
      features: [
        'Todo lo del plan Basic',
        'Hasta 50 unidades',
        'Reportes avanzados',
        'Soporte telefónico',
        'Personalización'
      ]
    }
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { type: plan.type },
      update: plan,
      create: plan
    });
  }

  console.log('Planes creados exitosamente');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
