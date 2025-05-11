import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const webhooks = [
    {
      name: 'whatsapp_create_instance',
      description: 'Webhook para crear una nueva instancia de WhatsApp en Evolution API',
      prodUrl: 'https://dn8nwebhookd.dydialabs.tech/webhook/e55e6aa1-b8e4-4c70-966b-a57dc5a99568',
      testUrl: 'https://dn8nd.dydialabs.tech/webhook-test/e55e6aa1-b8e4-4c70-966b-a57dc5a99568',
    },
    {
      name: 'whatsapp_get_status',
      description: 'Webhook para obtener el estado de una instancia de WhatsApp',
      prodUrl: 'https://dn8nwebhookd.dydialabs.tech/webhook/66aeb124-ba57-4f84-aa03-cc2639e9cbfe',
      testUrl: 'https://dn8nd.dydialabs.tech/webhook-test/66aeb124-ba57-4f84-aa03-cc2639e9cbfe',
    },
    {
      name: 'whatsapp_delete_instance',
      description: 'Webhook para eliminar una instancia de WhatsApp',
      prodUrl: 'https://dn8nwebhookd.dydialabs.tech/webhook/c7f7c762-6bdf-4cb6-9771-3e115a61ce48',
      testUrl: 'https://dn8nd.dydialabs.tech/webhook-test/c7f7c762-6bdf-4cb6-9771-3e115a61ce48',
    },
    {
      name: 'whatsapp_connect',
      description: 'Webhook para vincular un dispositivo WhatsApp mediante código QR',
      prodUrl: 'https://dn8nwebhookd.dydialabs.tech/webhook/604b8e29-4cd8-4d5e-bd43-904a062bc5ea',
      testUrl: 'https://dn8nd.dydialabs.tech/webhook-test/604b8e29-4cd8-4d5e-bd43-904a062bc5ea',
    },
    {
      name: 'whatsapp_disconnect',
      description: 'Webhook para desconectar una instancia de WhatsApp',
      prodUrl: 'https://dn8nwebhookd.dydialabs.tech/webhook/082f9635-4e9f-4160-8758-c368eeeec452',
      testUrl: 'https://dn8nd.dydialabs.tech/webhook-test/082f9635-4e9f-4160-8758-c368eeeec452',
    },
  ];

  console.log('Creando webhooks...');
  
  for (const webhook of webhooks) {
    await prisma.n8nWebhook.upsert({
      where: { name: webhook.name },
      update: webhook,
      create: webhook,
    });
  }

  console.log('Webhooks creados exitosamente');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
