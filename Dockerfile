FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Generar el cliente Prisma con el schema actualizado
RUN npx prisma generate

RUN npm run build

EXPOSE 3000

# Usar start:dev para tener hot-reload durante el desarrollo
CMD ["npm", "run", "start:dev"]
