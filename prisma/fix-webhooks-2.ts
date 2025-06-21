import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Corregir la URL del webhook de conexión (volver a poner la 'd')
  await prisma.n8nWebhook.update({
    where: { name: 'whatsapp_connect' },
    data: {
      prodUrl: 'https://dn8nwebhookd.dydialabs.tech/webhook/604b8e29-4cd8-4d5e-bd43-904a062bc5ea',
      testUrl: 'https://dn8nd.dydialabs.tech/webhook-test/604b8e29-4cd8-4d5e-bd43-904a062bc5ea'
    }
  });

  console.log('Webhook URL corregida');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
