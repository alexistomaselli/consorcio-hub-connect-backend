import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const webhooks = [
    {
      name: 'whatsapp_send_message',
      description: 'Envía mensajes de texto a través de WhatsApp usando la instancia del edificio',
      testUrl: 'https://dn8nd.dydialabs.tech/webhook-test/08a230c5-a7f9-4501-bfd2-8867210bb8e5',
      prodUrl: 'https://dn8nwebhookd.dydialabs.tech/webhook/08a230c5-a7f9-4501-bfd2-8867210bb8e5'
    },
    {
      name: 'email_send_verification',
      description: 'Webhook para envío de emails de verificación',
      testUrl: 'https://dn8nd.dydialabs.tech/webhook-test/2de94316-93c1-449e-80c6-d4b543a90ee5',
      prodUrl: 'https://dn8nwebhookd.dydialabs.tech/webhook/2de94316-93c1-449e-80c6-d4b543a90ee5'
    },
    {
      name: 'whatsapp_create_instance',
      description: 'Crea una nueva instancia de WhatsApp en Evolution API para un edificio específico. Este webhook inicializa la configuración necesaria para que el edificio pueda enviar y recibir mensajes.',
      prodUrl: 'https://dn8nwebhookd.dydialabs.tech/webhook/e55e6aa1-b8e4-4c70-966b-a57dc5a99568',
      testUrl: 'https://dn8nd.dydialabs.tech/webhook-test/e55e6aa1-b8e4-4c70-966b-a57dc5a99568',
    },
    {
      name: 'whatsapp_get_status',
      description: 'Consulta el estado actual de una instancia de WhatsApp, incluyendo si está conectada, desconectada o en proceso de conexión. También retorna información sobre el QR si está en proceso de vinculación.',
      prodUrl: 'https://dn8nwebhookd.dydialabs.tech/webhook/66aeb124-ba57-4f84-aa03-cc2639e9cbfe',
      testUrl: 'https://dn8nd.dydialabs.tech/webhook-test/66aeb124-ba57-4f84-aa03-cc2639e9cbfe',
    },
    {
      name: 'whatsapp_delete_instance',
      description: 'Elimina una instancia de WhatsApp existente, liberando los recursos asociados y desvinculando el dispositivo. Este proceso es necesario cuando se quiere desvincular completamente un edificio del sistema de WhatsApp.',
      prodUrl: 'https://dn8nwebhookd.dydialabs.tech/webhook/c7f7c762-6bdf-4cb6-9771-3e115a61ce48',
      testUrl: 'https://dn8nd.dydialabs.tech/webhook-test/c7f7c762-6bdf-4cb6-9771-3e115a61ce48',
    },
    {
      name: 'whatsapp_connect',
      description: 'Inicia el proceso de vinculación de un dispositivo WhatsApp mediante código QR. Este webhook genera un nuevo código QR y maneja el proceso de conexión hasta que el dispositivo esté correctamente vinculado.',
      prodUrl: 'https://dn8nwebhookd.dydialabs.tech/webhook/604b8e29-4cd8-4d5e-bd43-904a062bc5ea',
      testUrl: 'https://dn8nd.dydialabs.tech/webhook-test/604b8e29-4cd8-4d5e-bd43-904a062bc5ea',
    },
    {
      name: 'whatsapp_disconnect',
      description: 'Desconecta una instancia de WhatsApp activa, manteniendo la configuración pero cerrando la sesión del dispositivo. Útil cuando se necesita cambiar el dispositivo vinculado o resolver problemas de conexión.',
      prodUrl: 'https://dn8nwebhookd.dydialabs.tech/webhook/082f9635-4e9f-4160-8758-c368eeeec452',
      testUrl: 'https://dn8nd.dydialabs.tech/webhook-test/082f9635-4e9f-4160-8758-c368eeeec452',
    },
    {
      name: 'whatsapp_send_owner_invitation',
      description: 'Envía una invitación por WhatsApp a un propietario para que se registre en el sistema. Incluye el link de registro y el código de verificación.',
      prodUrl: 'https://dn8nwebhookd.dydialabs.tech/webhook/7f1a2b3c-4d5e-6f7g-8h9i-0j1k2l3m4n5o',
      testUrl: 'https://dn8nd.dydialabs.tech/webhook-test/7f1a2b3c-4d5e-6f7g-8h9i-0j1k2l3m4n5o',
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
