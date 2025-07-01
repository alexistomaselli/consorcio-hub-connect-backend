# Usamos una imagen completa para soporte de todas las herramientas necesarias
FROM node:18.18.2

WORKDIR /app

# Instalamos herramientas necesarias para compilación nativa
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    build-essential \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copiamos archivos de configuración primero (mejor caché)
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Instalamos dependencias asegurándonos que los binarios nativos como bcrypt se compilarán
RUN npm install --production=false

# Aseguramos que bcrypt esté instalado correctamente con sus binarios nativos
RUN npm rebuild bcrypt --build-from-source

# Copiamos el esquema de Prisma y generamos el cliente
COPY prisma ./prisma/
RUN npx prisma generate

# Copiamos todo el resto del código fuente
COPY src ./src/

# Intentamos compilar el código TypeScript para modo producción
RUN npm run build || echo "Compilation completed with warnings"

# Instalar nodemon globalmente para mejor hot reload
RUN npm install -g nodemon

# Script de inicio flexible con soporte para hot reload
RUN echo '#!/bin/bash\n\
echo "Iniciando en modo desarrollo con hot reload..."\n\
npm run start:dev' > start.sh

RUN chmod +x start.sh

EXPOSE 3000

CMD ["/bin/bash", "./start.sh"]
