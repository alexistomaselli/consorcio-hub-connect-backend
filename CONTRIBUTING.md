# Guía de contribución - Consorcio Hub Backend

## Modelo de ramas (GitFlow)

Este proyecto utiliza un modelo simplificado basado en GitFlow para gestionar el flujo de trabajo del desarrollo. Las ramas principales son:

### Ramas permanentes

- **`main`**: Código en producción. Solo recibe merges desde `develop` o `hotfix/*`.
- **`develop`**: Rama principal de desarrollo e integración. Todas las características se integran aquí antes de pasar a producción.

### Ramas temporales

- **`feature/*`**: Para nuevas funcionalidades (ejemplo: `feature/claims-endpoints`).
- **`fix/*`**: Para correcciones de bugs que no son urgentes (ejemplo: `fix/jwt-validation`).
- **`hotfix/*`**: Para correcciones urgentes en producción (ejemplo: `hotfix/security-patch`).
- **`release/*`**: Para preparar versiones para despliegue (ejemplo: `release/v1.2.0`).

## Flujo de trabajo

### Desarrollo de nuevas características

1. Crear una nueva rama desde `develop`:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/nombre-descriptivo
   ```

2. Desarrollar y hacer commits frecuentemente siguiendo las convenciones de commits:
   ```bash
   git add .
   git commit -m "feat: descripción corta del cambio"
   ```

3. Publicar la rama feature para revisión:
   ```bash
   git push origin feature/nombre-descriptivo
   ```

4. Crear un Pull Request en GitHub para mergearlo a `develop`.
5. Una vez aprobado, se hace merge a `develop`.

### Despliegue a producción

1. Cuando `develop` tiene suficientes características para un lanzamiento:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b release/vX.Y.Z
   ```

2. Probar exhaustivamente en un ambiente de staging.
3. Ejecutar las migraciones de Prisma si hay cambios en el esquema.
4. Si se necesitan correcciones, se hacen directamente en la rama `release/*`.
5. Una vez listo, crear un Pull Request para mergearlo a `main`.

### Correcciones urgentes (hotfix)

1. Crear una rama `hotfix` desde `main`:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b hotfix/descripcion-breve
   ```

2. Hacer la corrección y probarla a fondo.
3. Crear Pull Requests para mergear a `main` y a `develop`.

## Convención de commits

Usamos la convención de [Conventional Commits](https://www.conventionalcommits.org/) para nuestros mensajes de commit:

```
<tipo>[alcance opcional]: <descripción>

[cuerpo opcional]

[notas de pie opcionales]
```

### Tipos principales:

- **feat**: Nueva característica (feature)
- **fix**: Corrección de un bug
- **docs**: Cambios en documentación
- **style**: Cambios que no afectan el código (espacios, formato, etc.)
- **refactor**: Refactorización de código
- **test**: Agregar o corregir tests
- **chore**: Cambios en el proceso de build o herramientas auxiliares

Ejemplos específicos para backend:
```
feat(auth): implementar nuevo middleware de autenticación
fix(claims): corregir consulta SQL en ClaimsService
docs(swagger): actualizar anotaciones de API
db(schema): agregar nueva migración para tabla de notificaciones
```

## Estándares de código

### NestJS

- Seguir la estructura de módulos y servicios de NestJS.
- Usar decoradores para definir claramente los endpoints y sus parámetros.
- Documentar todos los endpoints con anotaciones Swagger.
- Implementar validación de DTOs con class-validator.

### Base de datos

- Los cambios en el esquema de la base de datos deben hacerse a través de migraciones de Prisma.
- Ejecutar `npx prisma generate` después de cambiar el esquema.
- Nombrar adecuadamente los modelos y relaciones siguiendo convenciones PascalCase.

## Testing

Se recomienda escribir pruebas para:

- Servicios críticos
- Controladores
- Guards y middlewares de autenticación

Para ejecutar las pruebas:
```bash
# Pruebas unitarias
npm run test

# Pruebas end-to-end
npm run test:e2e

# Cobertura de código
npm run test:cov
```

## Versionado

Usamos [Versionado Semántico](https://semver.org/):

- **MAJOR**: Cambios incompatibles con versiones anteriores (cambios en la API)
- **MINOR**: Nuevas funcionalidades compatibles con versiones anteriores
- **PATCH**: Correcciones de bugs compatibles con versiones anteriores

## Despliegue

El despliegue se realiza a través de Docker utilizando el Dockerfile incluido en el repositorio. 
Asegúrate de actualizar las variables de entorno según el entorno de destino.
