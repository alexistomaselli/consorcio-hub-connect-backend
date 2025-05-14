import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const webhooks = await prisma.n8nWebhook.findMany();
  console.log('Webhooks encontrados:', webhooks);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
