import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProfileModule } from './modules/profile/profile.module';
import { BuildingsModule } from './modules/buildings/buildings.module';
import { PrismaModule } from './prisma/prisma.module';
import { N8nModule } from './modules/n8n/n8n.module';
import { OwnersModule } from './modules/owners/owners.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    AuthModule,
    PrismaModule,
    BuildingsModule,
    UsersModule,
    OwnersModule,
    ProfileModule,
    N8nModule,
  ],
})
export class AppModule {}
