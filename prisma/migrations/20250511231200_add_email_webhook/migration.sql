-- Agregar webhook para envío de emails
INSERT INTO "n8n_webhooks" ("id", "name", "description", "prodUrl", "createdAt", "updatedAt")
VALUES (
  'email_send_verification',
  'email_send_verification',
  'Envía un email de verificación al administrador del edificio',
  'https://n8n.consorcio-hub.com/webhook/email-verification',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);
