import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/services/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from '@prisma/client';
import { UserWithBuildings } from './types/user.types';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    
    return this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
      },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        emailVerifications: true,
        managedBuildings: {
          include: {
            plan: true
          }
        }
      }
    });
  }

  async findByWhatsApp(whatsappNumber: string): Promise<UserWithBuildings | null> {
    const user = await this.prisma.user.findFirst({
      where: { whatsappNumber },
      include: {
        managedBuildings: {
          include: {
            plan: true
          }
        },
        emailVerifications: true
      }
    });

    return user as UserWithBuildings | null;
  }
}
