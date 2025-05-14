import { Prisma, User, UserRole, PlanType, EmailVerification } from '@prisma/client';

export type UserWithBuildings = User & {
  managedBuildings?: {
    id: string;
    name: string;
    plan: {
      id: string;
      type: PlanType;
      name: string;
      description: string;
      price: number;
      features: string[];
      createdAt: Date;
      updatedAt: Date;
    };
    createdAt: Date;
    updatedAt: Date;
    trialEndsAt: Date | null;
  }[];
  emailVerifications?: EmailVerification[];
};

export type UserWithBuildingRelations = UserWithBuildings;

export interface UserResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  role: UserRole;
  whatsappNumber?: string | null;
  isProfileComplete?: boolean;
  managedBuildings?: {
    id: string;
    name: string;
    plan: {
      id: string;
      type: PlanType;
      name: string;
      description: string;
      price: number;
      features: string[];
    };
  }[];
  emailVerifications?: EmailVerification[];
};
