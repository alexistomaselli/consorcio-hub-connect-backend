# Consorcio Hub Connect - Backend

Backend para la plataforma de gestión de consorcios que permite la administración de edificios, espacios, propietarios y reclamos.

## Tecnologías

- **Framework**: NestJS con TypeScript
- **ORM**: Prisma
- **Base de datos**: PostgreSQL
- **Autenticación**: JWT, Guards basados en roles
- **Documentación API**: Swagger

## Características principales

- Gestión de edificios y espacios
- Gestión de propietarios y usuarios
- Sistema de reclamos dinámico con tablas específicas por edificio
- Autenticación JWT con roles diferenciados
- Integración con WhatsApp para notificaciones
- Swagger UI para documentación y prueba de API

## Requisitos

- Node.js >= 18.x
- PostgreSQL >= 15.x

## Configuración

1. Clona el repositorio:
```bash
git clone https://github.com/tu-usuario/consorcio-hub-backend.git
cd consorcio-hub-backend
```

2. Instala las dependencias:
```bash
npm install
```

3. Configura las variables de entorno:
```bash
cp .env.example .env
# Edita el archivo .env con tus configuraciones
```

4. Ejecuta las migraciones de Prisma:
```bash
npx prisma migrate dev
```

## Ejecución

```bash
# Desarrollo
npm run start:dev

# Producción
npm run build
npm run start:prod
```

## API Endpoints

Al iniciar la aplicación, puedes acceder a la documentación Swagger en:
```
http://localhost:3000/docs
```

## Docker

Este proyecto incluye configuración Docker para facilitar el despliegue:

```bash
# Construir la imagen Docker
docker build -t consorcio-hub-backend .

# Ejecutar el contenedor
docker run -p 3000:3000 --env-file .env consorcio-hub-backend
```

También puedes usar Docker Compose para ejecutar la aplicación con la base de datos:

```bash
docker-compose up -d
```

## Estructura del Proyecto

```
src/
├── modules/           # Módulos de la aplicación organizados por dominio
│   ├── auth/          # Autenticación y autorización
│   ├── buildings/     # Gestión de edificios
│   ├── claims/        # Sistema de reclamos
│   ├── owners/        # Gestión de propietarios
│   └── spaces/        # Gestión de espacios/unidades
├── prisma/            # Cliente Prisma y definiciones de esquema
├── config/            # Configuraciones
└── main.ts            # Punto de entrada de la aplicación
```

## Scripts SQL

El proyecto incluye scripts SQL para configurar las tablas dinámicas para reclamos y espacios:

- `create-claims-tables.sql`: Crea las tablas necesarias para el sistema de reclamos
- `create-spaces-tables.sql`: Crea las tablas necesarias para la gestión de espacios

## Contribución

Para contribuir al proyecto, por favor sigue estos pasos:

1. Haz fork del repositorio
2. Crea una rama para tu funcionalidad (`git checkout -b feature/nueva-funcionalidad`)
3. Realiza tus cambios y haz commit (`git commit -am 'Agrega nueva funcionalidad'`)
4. Sube los cambios a tu fork (`git push origin feature/nueva-funcionalidad`)
5. Crea un Pull Request

## Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo LICENSE.md para más detalles.
