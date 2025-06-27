import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProfileModule } from './modules/profile/profile.module';
import { BuildingsModule } from './modules/buildings/buildings.module';
import { PrismaModule } from './prisma/prisma.module';
import { N8nModule } from './modules/n8n/n8n.module';
import { OwnersModule } from './modules/owners/owners.module';
import { SpacesModule } from './modules/spaces/spaces.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { ClaimsModule } from './modules/claims/claims.module';
import { WhatsAppModule } from './modules/buildings/whatsapp.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ClaimsModule, // Mover al principio para asegurarnos que se carga correctamente
    AuthModule,
    PrismaModule,
    BuildingsModule,
    WhatsAppModule, // Agregar explícitamente el WhatsAppModule
    UsersModule,
    OwnersModule,
    ProfileModule,
    N8nModule,
    SpacesModule,
    ProvidersModule,
  ],
})
export class AppModule {}
