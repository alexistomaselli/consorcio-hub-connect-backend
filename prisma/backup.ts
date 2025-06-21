import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Obtener planes
  const plans = await prisma.plan.findMany();
  console.log('=== Planes ===');
  console.log(JSON.stringify(plans, null, 2));

  // Obtener webhooks
  const webhooks = await prisma.n8nWebhook.findMany();
  console.log('=== Webhooks ===');
  console.log(JSON.stringify(webhooks, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
