// Script para ejecutar SQL a través de Prisma
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function runSqlScript() {
  try {
    console.log('📄 Leyendo archivo SQL...');
    const sqlScript = fs.readFileSync('./create-spaces-tables.sql', 'utf8');
    
    console.log('🚀 Ejecutando script SQL...');
    await prisma.$executeRawUnsafe(sqlScript);
    
    console.log('✅ Tablas de espacios creadas con éxito!');
  } catch (error) {
    console.error('❌ Error ejecutando el script SQL:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runSqlScript();
