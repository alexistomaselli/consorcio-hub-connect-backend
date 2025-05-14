import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const webhook = await prisma.n8nWebhook.create({
    data: {
      name: 'whatsapp_create_instance',
      description: 'Crea una nueva instancia de WhatsApp en Evolution API para un edificio específico.',
      prodUrl: 'https://dn8nwebhookd.dydialabs.tech/webhook/e55e6aa1-b8e4-4c70-966b-a57dc5a99568',
      testUrl: 'https://dn8nd.dydialabs.tech/webhook-test/e55e6aa1-b8e4-4c70-966b-a57dc5a99568',
    }
  });

  console.log('Webhook creado:', webhook);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
