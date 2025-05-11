import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { WhatsAppService } from '../buildings/whatsapp.service';
import * as crypto from 'crypto';
import { BuildingsService } from '../buildings/buildings.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dtos/register.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import * as bcrypt from 'bcrypt';
import { PlanType, UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async createOwnerVerification(userId: string, buildingId: string, whatsappNumber: string, firstName: string, lastName: string, unitNumber: string) {
    const verifyCode = this.generateVerificationCode();
    const tempToken = crypto.randomBytes(32).toString('hex');

    await this.prisma.ownerVerification.create({
      data: {
        firstName,
        lastName,
        whatsappNumber,
        unitNumber,
        tempToken,
        verifyCode,
        buildingId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
      }
    });

    // Enviar código por WhatsApp
    await this.whatsappService.sendTextMessage(
      buildingId,
      whatsappNumber,
      `Tu código de verificación es: ${verifyCode}`
    );

    return tempToken;
  }
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private buildingsService: BuildingsService,
    private whatsappService: WhatsAppService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user?.password && await bcrypt.compare(password, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Obtener el edificio asociado al usuario
    const building = await this.prisma.building.findFirst({
      where: {
        adminId: user.id
      },
      include: {
        plan: true
      }
    });

    if (!building) {
      throw new Error('No building found for this user');
    }

    const payload = { email: user.email, sub: user.id, role: user.role };
    
    // Incluir el nombre del edificio en la respuesta
    const userWithBuilding = {
      ...user,
      buildingName: building.name,
      buildingData: {
        address: building.address || '',
        floors: building.floors || '',
        totalUnits: building.totalUnits || '',
        constructionYear: building.constructionYear || '',
        contact: {
          phone: building.phoneNumber || '',
          whatsapp: building.whatsapp || '',
          website: building.website || '',
          description: building.description || ''
        },
        adminPhone: building.phoneNumber || ''
      }
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: userWithBuilding,
      building
    };
  }

  async registerUser(registerDto: RegisterUserDto) {
    // Validar que al menos tenga email o whatsappNumber
    if (!registerDto.email && !registerDto.whatsappNumber) {
      throw new BadRequestException('Se requiere email o número de WhatsApp');
    }

    // Verificar si el email ya existe (si se proporcionó)
    if (registerDto.email) {
      const existingUser = await this.usersService.findByEmail(registerDto.email);
      if (existingUser) {
        throw new ConflictException('Email already registered');
      }
    }

    // Verificar si el WhatsApp ya existe (si se proporcionó)
    if (registerDto.whatsappNumber) {
      const existingUser = await this.prisma.user.findFirst({
        where: {
          whatsappNumber: registerDto.whatsappNumber
        }
      });
      if (existingUser) {
        throw new ConflictException('WhatsApp number already registered');
      }
    }

    // Verificar si el edificio existe
    const building = await this.prisma.building.findUnique({
      where: { id: registerDto.buildingId },
      include: { plan: true }
    });

    if (!building) {
      throw new Error('Building not found');
    }

    // Hash de la contraseña si se proporciona
    let hashedPassword: string | undefined;
    if (registerDto.password) {
      hashedPassword = await bcrypt.hash(registerDto.password, 10);
    }

    // Preparar los datos del usuario según el rol
    const userData: Prisma.UserCreateInput = {
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      role: registerDto.role,
      email: registerDto.email || undefined,
      password: hashedPassword || undefined,
      phoneNumber: registerDto.whatsappNumber || undefined,
      ownedBuildings: registerDto.role === UserRole.OWNER ? {
        create: {
          building: {
            connect: {
              id: registerDto.buildingId
            }
          },
          unitNumber: registerDto.unitNumber || '',
          isVerified: false
        }
      } : undefined
    };

    // Crear el usuario
    const user = await this.prisma.user.create({
      data: userData
    });

    // Si es un owner y tiene WhatsApp, generar verificación
    if (registerDto.role === UserRole.OWNER && registerDto.whatsappNumber) {
      if (!registerDto.unitNumber) {
        throw new BadRequestException('El número de unidad es requerido para propietarios');
      }
      const tempToken = await this.createOwnerVerification(
        user.id,
        registerDto.buildingId,
        registerDto.whatsappNumber,
        registerDto.firstName,
        registerDto.lastName,
        registerDto.unitNumber
      );
      // Agregar el token a la respuesta
      return {
        ...user,
        tempToken
      };
    }

    // Generar token JWT
    const payload = { 
      email: user.email, 
      sub: user.id, 
      role: user.role 
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        ...user,
        buildingId: building.id,
        buildingName: building.name
      },
      building
    };
  }

  async register(registerDto: RegisterDto) {
    console.log('Starting registration with data:', registerDto);
    // Verificar si el email ya existe
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Convertir el nombre del plan al formato del enum PlanType
    const planTypeMap = {
      'Free': PlanType.FREE,
      'Basic': PlanType.BASIC,
      'Pro': PlanType.PRO
    };
    
    const planType = planTypeMap[registerDto.planName];
    console.log('Plan type:', planType);
    if (!planType) {
      throw new Error(`Invalid plan name: ${registerDto.planName}`);
    }

    console.log('Looking for plan with type:', planType);
    const selectedPlan = await this.prisma.plan.findUnique({
      where: { type: planType }
    });
    console.log('Found plan:', selectedPlan);

    if (!selectedPlan) {
      throw new Error(`Plan ${registerDto.planName} not found`);
    }

    // Crear usuario y edificio en una transacción
    const result = await this.prisma.$transaction(async (prisma) => {
      // Hash de la contraseña
      const hashedPassword = await bcrypt.hash(registerDto.password, 10);

      // Crear el usuario
      const user = await prisma.user.create({
        data: {
          email: registerDto.email,
          password: hashedPassword,
          firstName: registerDto.firstName,
          lastName: registerDto.lastName,
          role: UserRole.BUILDING_ADMIN,
        }
      });

      // Crear el edificio con el trial
      const building = await prisma.building.create({
        data: {
          name: registerDto.buildingName,
          address: '',  // Campo requerido por el schema
          schema: `building_${user.id}`, // Schema único por edificio
          adminId: user.id,
          planId: selectedPlan.id,
          trialEndsAt: selectedPlan.type === PlanType.FREE ? 
            new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : // 14 días para plan FREE
            null
        },
        include: {
          plan: true,
          admin: true
        }
      });

      // Crear el schema y las tablas para el edificio
      await this.buildingsService.createBuildingTables(building.schema);

      return { user, building };
    });

    // Generar token JWT
    const payload = { 
      email: result.user.email, 
      sub: result.user.id, 
      role: result.user.role 
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: result.user,
      building: result.building,
      trialEndsAt: result.building.trialEndsAt
    };
  }
}
