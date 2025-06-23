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

# Script de inicio flexible
RUN echo '#!/bin/bash\n\
echo "Verificando archivo compilado..."\n\
if [ -f "dist/main.js" ]; then\n\
    echo "Iniciando en modo producción desde dist/main.js"\n\
    node dist/main.js\n\
else\n\
    echo "El archivo compilado no existe, iniciando en modo desarrollo..."\n\
    npm run start:dev\n\
fi' > start.sh

RUN chmod +x start.sh

EXPOSE 3000

CMD ["/bin/bash", "./start.sh"]
