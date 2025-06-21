import { Module } from '@nestjs/common';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaModule } from '../../prisma/prisma.module';
import { BuildingsModule } from '../buildings/buildings.module';
import { N8nWebhookModule } from '../n8n/n8n-webhook.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    WhatsappModule,
    UsersModule,
    PassportModule,
    BuildingsModule,
    PrismaModule,
    N8nWebhookModule,
    ConfigModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
