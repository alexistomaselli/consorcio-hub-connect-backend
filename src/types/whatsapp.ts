export type WhatsappStatus = 'DISCONNECTED' | 'PENDING' | 'CONNECTED' | 'FAILED';
export type N8nFlowStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export interface WhatsAppInstance {
  id: string;
  buildingId: string;
  instanceId?: string;  // Nullable hasta que n8n confirme la creación
  instanceName: string;  // "<buildingName> - <buildingId>"
  status: WhatsappStatus;
  n8nFlowStatus: N8nFlowStatus;
  evolutionApiStatus?: string;  // Estado raw de Evolution API
  qrCode?: string;  // Para el proceso de conexión
  phoneNumber?: string;  // Solo disponible cuando está conectado
  createdAt: Date;
  updatedAt: Date;
}
