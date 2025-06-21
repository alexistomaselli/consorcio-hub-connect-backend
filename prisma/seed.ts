import { PrismaClient, PlanType } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Crear planes predefinidos
  const plans = [
    {
      id: 'plan_free',
      type: PlanType.FREE,
      name: 'Trial',
      description: 'Prueba todas las funcionalidades por 14 días',
      maxUnits: 999999, // Sin límite durante el trial
      price: 0,
      trialDays: 14,
      features: [
        'Prueba por 14 días',
        'Todas las funcionalidades disponibles',
        'Sin límite de unidades durante el trial',
        'Soporte por email'
      ],
      updatedAt: new Date()
    },
    {
      id: 'plan_basic',
      type: PlanType.BASIC,
      name: 'Basic',
      description: 'Para edificios pequeños y medianos',
      maxUnits: 30,
      price: 29.99,
      trialDays: 0,
      features: [
        'Hasta 30 unidades',
        'Gestión avanzada de reclamos',
        'Notificaciones por email',
        'Chat de soporte',
        'Reportes básicos'
      ],
      updatedAt: new Date()
    },
    {
      id: 'plan_pro',
      type: PlanType.PRO,
      name: 'Professional',
      description: 'Para edificios grandes',
      maxUnits: 100,
      price: 79.99,
      trialDays: 0,
      features: [
        'Hasta 100 unidades',
        'Gestión completa de reclamos',
        'Notificaciones por email y WhatsApp',
        'Soporte prioritario',
        'Reportes avanzados',
        'API access'
      ],
      updatedAt: new Date()
    },
    {
      id: 'plan_enterprise',
      type: PlanType.ENTERPRISE,
      name: 'Enterprise',
      description: 'Solución personalizada para grandes consorcios',
      maxUnits: 999999, // Ilimitado
      price: 199.99,
      trialDays: 0,
      features: [
        'Unidades ilimitadas',
        'Todas las características de Pro',
        'Soporte 24/7',
        'Implementación personalizada',
        'API access con mayor límite',
        'SLA garantizado'
      ],
      updatedAt: new Date()
    }
  ]

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { type: plan.type },
      update: plan,
      create: plan
    })
  }

  console.log('Planes creados/actualizados correctamente');

  // Crear webhooks de n8n
  const webhooks = [
    {
      id: 'cmak6ino700009k0j8p7vtpua',
      name: 'whatsapp_create_instance',
      description: 'Crea una nueva instancia de WhatsApp en Evolution API para un edificio específico. Este webhook inicializa la configuración necesaria para que el edificio pueda enviar y recibir mensajes.',
      prodUrl: 'https://dn8nwebhookd.dydialabs.tech/webhook/e55e6aa1-b8e4-4c70-966b-a57dc5a99568',
      testUrl: 'https://dn8nd.dydialabs.tech/webhook-test/e55e6aa1-b8e4-4c70-966b-a57dc5a99568',
      updatedAt: new Date('2025-05-11T21:45:41.415Z')
    },
    {
      id: 'cmak6inof00019k0jrdjxknb9',
      name: 'whatsapp_get_status',
      description: 'Consulta el estado actual de una instancia de WhatsApp, incluyendo si está conectada, desconectada o en proceso de conexión. También retorna información sobre el QR si está en proceso de vinculación.',
      prodUrl: 'https://dn8nwebhookd.dydialabs.tech/webhook/66aeb124-ba57-4f84-aa03-cc2639e9cbfe',
      testUrl: 'https://dn8nd.dydialabs.tech/webhook-test/66aeb124-ba57-4f84-aa03-cc2639e9cbfe',
      updatedAt: new Date('2025-05-11T21:45:41.423Z')
    },
    {
      id: 'cmak6inog00029k0ju4xcu75n',
      name: 'whatsapp_delete_instance',
      description: 'Elimina una instancia de WhatsApp existente, liberando los recursos asociados y desvinculando el dispositivo. Este proceso es necesario cuando se quiere desvincular completamente un edificio del sistema de WhatsApp.',
      prodUrl: 'https://dn8nwebhookd.dydialabs.tech/webhook/c7f7c762-6bdf-4cb6-9771-3e115a61ce48',
      testUrl: 'https://dn8nd.dydialabs.tech/webhook-test/c7f7c762-6bdf-4cb6-9771-3e115a61ce48',
      updatedAt: new Date('2025-05-11T21:45:41.425Z')
    },
    {
      id: 'cmak6inoh00039k0jrihts471',
      name: 'whatsapp_connect',
      description: 'Inicia el proceso de vinculación de un dispositivo WhatsApp mediante código QR. Este webhook genera un nuevo código QR y maneja el proceso de conexión hasta que el dispositivo esté correctamente vinculado.',
      prodUrl: 'https://dn8nwebhookd.dydialabs.tech/webhook/604b8e29-4cd8-4d5e-bd43-904a062bc5ea',
      testUrl: 'https://dn8nd.dydialabs.tech/webhook-test/604b8e29-4cd8-4d5e-bd43-904a062bc5ea',
      updatedAt: new Date('2025-05-11T21:45:41.426Z')
    },
    {
      id: 'cmak6inoh00049k0jpy2ay8d5',
      name: 'whatsapp_disconnect',
      description: 'Desconecta una instancia de WhatsApp activa, manteniendo la configuración pero cerrando la sesión del dispositivo. Útil cuando se necesita cambiar el dispositivo vinculado o resolver problemas de conexión.',
      prodUrl: 'https://dn8nwebhookd.dydialabs.tech/webhook/082f9635-4e9f-4160-8758-c368eeeec452',
      testUrl: 'https://dn8nd.dydialabs.tech/webhook-test/082f9635-4e9f-4160-8758-c368eeeec452',
      updatedAt: new Date('2025-05-11T21:45:41.426Z')
    },
    {
      id: 'email_send_verification',
      name: 'email_send_verification',
      description: 'Envía un email de verificación al administrador del edificio',
      prodUrl: 'https://dn8nwebhookd.dydialabs.tech/webhook/2de94316-93c1-449e-80c6-d4b543a90ee5',
      testUrl: 'https://dn8nd.dydialabs.tech/webhook-test/2de94316-93c1-449e-80c6-d4b543a90ee5',
      updatedAt: new Date('2025-05-11T23:46:26.688Z')
    }
  ];

  for (const webhook of webhooks) {
    await prisma.n8nWebhook.upsert({
      where: { name: webhook.name },
      update: webhook,
      create: webhook
    });
  }

  console.log('Webhooks creados/actualizados correctamente')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
