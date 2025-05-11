// Los webhooks ahora se obtienen de la base de datos
// Ver: src/modules/n8n/n8n-webhook.service.ts
export interface WebhookConfig {
  url: string;
  method: 'GET' | 'POST';
  requiresAuth: boolean;
}

export interface N8nWebhookResponse {
  success: boolean;
  error?: string;
  data?: {
    instanceId?: string;
    connectionStatus?: string;
  };
  instanceId?: string;
  connectionStatus?: string;
  qrCode?: string;
  message?: string;
}
