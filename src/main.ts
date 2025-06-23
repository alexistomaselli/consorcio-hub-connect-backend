import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { INestApplication } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Añadir prefijo global /api a todas las rutas
  //app.setGlobalPrefix('api');

  // CORS completamente abierto para desarrollo
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Access-Control-Allow-Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    
    next();
  });
  
  // La configuración oficial de CORS para rutas específicas
  app.enableCors({
    origin: '*', // Permite cualquier origen
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: '*',
  });

  // Configurar Swagger
  const config = new DocumentBuilder()
    .setTitle('Consorcio Hub API')
    .setDescription('API para la gestión de edificios y propietarios')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('owners', 'Operaciones relacionadas con propietarios')
    .addTag('claims', 'Operaciones relacionadas con reclamos')
    .addTag('buildings', 'Operaciones relacionadas con edificios')
    .addTag('spaces', 'Operaciones relacionadas con espacios')
    .addTag('providers', 'Operaciones relacionadas con proveedores')
    .build();
  
  const document = SwaggerModule.createDocument(app, config, {
    // Incluir explícitamente todos los módulos para asegurar que se registren en Swagger
    include: [AppModule],
    extraModels: [],
    deepScanRoutes: true,
  });
  SwaggerModule.setup('docs', app, document);

  // Log registered routes for debugging - con manejo seguro
  try {
    console.log('==== REGISTERED ROUTES ====');
    const server = app.getHttpServer();
    if (server && server._events && server._events.request && server._events.request._router) {
      const router = server._events.request._router;
      if (router && router.stack) {
        router.stack.forEach(layer => {
          if (layer.route) {
            const path = layer.route?.path;
            const method = layer.route?.stack[0]?.method?.toUpperCase();
            console.log(`${method} ${path}`);
          }
        });
      }
    } else {
      console.log('La estructura del router no está disponible aún');
    }
    console.log('==========================');
  } catch (error) {
    console.log('Error al imprimir las rutas:', error?.message || 'Error desconocido');
  }

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
