// Usamos el tipo generico basado en la estructura de Prisma

export class Regulation {
  id: string;
  
  // ID del edificio al que pertenece el reglamento
  buildingId: string;
  
  // Relación con el edificio (tipo generico)
  building?: any;
  
  // Nombre del archivo original
  filename: string;
  
  // Ruta del archivo en MinIO
  filePath: string;
  
  // URL para acceder al archivo (puede ser presigned)
  fileUrl?: string;
  
  // Tamaño del archivo en bytes
  fileSize: number;
  
  // Tipo MIME del archivo
  mimeType: string;
  
  // Fecha de subida
  uploadedAt: Date;
  
  // Fecha de última actualización
  updatedAt: Date;
  
  // Estado del procesamiento OCR y embeddings
  isProcessed: boolean;
  
  // Nombre del webhook que procesa el documento
  webhookName: string;
}
